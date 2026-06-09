import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import getRdbClient, { wrapDbCall } from '@trend-diary/datastore/rdb'
import type { ArticleMedia } from '@trend-diary/domain/article/media'
import { inArray } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'

type D1Database = import('@cloudflare/workers-types').D1Database

export type CronEnv = {
  DB: D1Database
  LOG_LEVEL?: import('@trend-diary/common/logger').LogLevel
}

export type FeedItem = {
  title: string
  author: string
  description: string
  url: string
}

const MAX_LENGTH = {
  media: 10,
  title: 100,
  author: 30,
  description: 1024,
}

function truncateByCodePoint(text: string, maxLength: number): string {
  return [...text].slice(0, maxLength).join('')
}

export async function storeArticles(
  media: ArticleMedia,
  items: FeedItem[],
  env: CronEnv,
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

  const existingResult = await wrapDbCall(() =>
    db
      .select({ url: articles.url })
      .from(articles)
      .where(
        inArray(
          articles.url,
          normalized.map((item) => item.url),
        ),
      ),
  )
  if (existingResult.isErr()) {
    return err(existingResult.error)
  }

  const existingUrlSet = new Set(existingResult.value.map((item) => item.url))
  const feedUrlSet = new Set<string>()
  const uniqueNormalized: typeof normalized = []
  for (const article of normalized) {
    if (feedUrlSet.has(article.url)) continue
    feedUrlSet.add(article.url)
    uniqueNormalized.push(article)
  }
  const toInsert = uniqueNormalized.filter((item) => !existingUrlSet.has(item.url))

  if (toInsert.length === 0) return ok(0)

  let insertedCount = 0
  for (const article of toInsert) {
    // INFO: D1互換のため記事は1件ずつ保存する
    const insertResult = await wrapDbCall(() => db.insert(articles).values(article))
    if (insertResult.isErr()) {
      if (isUniqueConstraintError(insertResult.error)) continue
      return err(insertResult.error)
    }
    insertedCount += 1
  }

  return ok(insertedCount)
}

// Drizzle はドライバエラーを DrizzleQueryError でラップし元エラーを cause に格納するため、
// cause チェーンを辿って 'UNIQUE constraint failed'(D1/SQLite共通)を探す。
function isUniqueConstraintError(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; depth < 5 && current != null; depth += 1) {
    if (typeof current !== 'object') break
    const candidate = current as { message?: unknown; cause?: unknown }
    if (
      typeof candidate.message === 'string' &&
      candidate.message.includes('UNIQUE constraint failed')
    ) {
      return true
    }
    current = candidate.cause
  }
  return false
}
