import getRdbClient, { wrapDbCall } from '@trend-diary/datastore/rdb'
import { articles } from '@trend-diary/datastore/schema'
import type { ArticleMedia } from '@trend-diary/domain/article/media'
import { ARTICLE_MAX_LENGTH } from '@trend-diary/domain/article/schema/article-schema'
import { assertNonNull } from '@trend-diary/std/contract'
import { eq } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import type { FetchEnv } from '../env'
import type { NormalizedItem } from './config'

// D1のバインドパラメータ上限は1文あたり100個。安全マージンとして上限の80%までを使う
const MAX_BIND_PARAMETERS = 100
const BIND_PARAMETER_USAGE_RATIO = 0.8

function* chunk<T>(items: readonly T[], size: number): Generator<T[]> {
  for (let i = 0; i < items.length; i += size) {
    yield items.slice(i, i + size)
  }
}

function truncateByCodePoint(text: string, maxLength: number): string {
  return [...text].slice(0, maxLength).join('')
}

// 画像URLは記事挿入後に別途解決するため、挿入時点では持たない（og_image_url は NULL で入る）。
// 挿入できた記事のURL一覧を返し、呼び出し側の画像解決の対象にする
export async function storeArticles(
  media: ArticleMedia,
  items: NormalizedItem[],
  env: FetchEnv,
): Promise<Result<string[], Error>> {
  const db = getRdbClient(env.DB)
  if (items.length === 0) return ok([])

  // media はバッチ全体で不変のため切り詰めをループ外で一度だけ行う
  const truncatedMedia = truncateByCodePoint(media, ARTICLE_MAX_LENGTH.media)

  const normalized = items.map((item) => ({
    media: truncatedMedia,
    title: truncateByCodePoint(item.title, ARTICLE_MAX_LENGTH.title),
    author: truncateByCodePoint(item.author, ARTICLE_MAX_LENGTH.author),
    description: truncateByCodePoint(item.description, ARTICLE_MAX_LENGTH.description),
    url: truncateByCodePoint(item.url, ARTICLE_MAX_LENGTH.url),
  }))

  // 同一フィード内のURL重複を除去する（複数行INSERT内の自己重複を避けるため）
  const feedUrlSet = new Set<string>()
  const uniqueNormalized: typeof normalized = []
  for (const article of normalized) {
    if (feedUrlSet.has(article.url)) continue
    feedUrlSet.add(article.url)
    uniqueNormalized.push(article)
  }

  const [firstArticle] = uniqueNormalized
  // items 非空なら重複除去後も必ず1件残る。到達したら不変条件の破れなので0件成功に偽装せず送出する
  assertNonNull(firstArticle, 'uniqueNormalized[0] when items exist')
  // スキーマ変更に追従できるよう、チャンクサイズは1行のカラム数から動的に算出する
  const chunkSize = Math.floor(
    (MAX_BIND_PARAMETERS * BIND_PARAMETER_USAGE_RATIO) / Object.keys(firstArticle).length,
  )

  // ON CONFLICT DO NOTHING で既存URLをスキップし、returning した行を挿入分とする
  const insertedUrls: string[] = []
  for (const articlesChunk of chunk(uniqueNormalized, chunkSize)) {
    const insertResult = await wrapDbCall(() =>
      db
        .insert(articles)
        .values(articlesChunk)
        .onConflictDoNothing({ target: articles.url })
        .returning({ url: articles.url }),
    )
    if (insertResult.isErr()) {
      return err(insertResult.error)
    }
    insertedUrls.push(...insertResult.value.map((row) => row.url))
  }

  return ok(insertedUrls)
}

export interface ArticleOgImageEntry {
  url: string
  ogImageUrl: string
}

export async function updateArticleOgImageUrls(
  entries: ArticleOgImageEntry[],
  env: FetchEnv,
): Promise<Result<number, Error>> {
  const db = getRdbClient(env.DB)
  if (entries.length === 0) return ok(0)

  const [firstStatement, ...restStatements] = entries.map((entry) =>
    db.update(articles).set({ ogImageUrl: entry.ogImageUrl }).where(eq(articles.url, entry.url)),
  )
  // entries 非空なら必ず1文目が存在する。到達したら不変条件の破れなので送出する
  assertNonNull(firstStatement, 'statements[0] when entries exist')

  // D1 への往復を1回に抑えるため、記事ごとの UPDATE を batch で一括送信する
  const result = await wrapDbCall(() => db.batch([firstStatement, ...restStatements]))
  if (result.isErr()) {
    return err(result.error)
  }

  return ok(entries.length)
}
