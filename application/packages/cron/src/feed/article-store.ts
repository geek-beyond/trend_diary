import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import getRdbClient, { wrapDbCall } from '@trend-diary/datastore/rdb'
import type { ArticleMedia } from '@trend-diary/domain/article/media'
import { err, ok, type Result } from 'neverthrow'
import type { FetchEnv } from '../env'
import type { NormalizedItem } from './config'

const MAX_LENGTH = {
  media: 10,
  title: 100,
  author: 30,
  description: 1024,
}

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

  const normalized = items.map((item) => ({
    media: truncateByCodePoint(media, MAX_LENGTH.media),
    title: truncateByCodePoint(item.title, MAX_LENGTH.title),
    author: truncateByCodePoint(item.author, MAX_LENGTH.author),
    description: truncateByCodePoint(item.description, MAX_LENGTH.description),
    url: item.url,
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
  if (firstArticle === undefined) return ok(0)
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
