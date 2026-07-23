import getRdbClient, { wrapDbCall } from '@trend-diary/datastore/rdb'
import { articles } from '@trend-diary/datastore/schema'
import type { ArticleMedia } from '@trend-diary/domain/article/media'
import { ARTICLE_MAX_LENGTH } from '@trend-diary/domain/article/schema/article-schema'
import { assertNonNull } from '@trend-diary/std/contract'
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

export async function storeArticles(
  media: ArticleMedia,
  items: NormalizedItem[],
  env: FetchEnv,
): Promise<Result<number, Error>> {
  const db = getRdbClient(env.DB)
  if (items.length === 0) return ok(0)

  // media はバッチ全体で不変のため切り詰めをループ外で一度だけ行う
  const truncatedMedia = truncateByCodePoint(media, ARTICLE_MAX_LENGTH.media)

  const normalized = items.map((item) => ({
    media: truncatedMedia,
    title: truncateByCodePoint(item.title, ARTICLE_MAX_LENGTH.title),
    author: truncateByCodePoint(item.author, ARTICLE_MAX_LENGTH.author),
    description: truncateByCodePoint(item.description, ARTICLE_MAX_LENGTH.description),
    url: truncateByCodePoint(item.url, ARTICLE_MAX_LENGTH.url),
    // URL は切り詰めると壊れるため、上限超過はスキーマ検証（normalizedItemSchema.imageUrl）で null に縮退済み
    imageUrl: item.imageUrl,
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

  // ON CONFLICT DO NOTHING で既存URLをスキップし、returning した行数を挿入件数とする
  let insertedCount = 0
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
    insertedCount += insertResult.value.length
  }

  return ok(insertedCount)
}
