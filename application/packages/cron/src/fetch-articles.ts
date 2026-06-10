import { fetchWithTimeout } from '@trend-diary/common/http'
import type Logger from '@trend-diary/common/logger'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { articles } from '@trend-diary/datastore/drizzle-orm/schema'
import getRdbClient, { wrapDbCall } from '@trend-diary/datastore/rdb'
import type { ArticleMedia } from '@trend-diary/domain/article/media'
import { inArray } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import Parser from 'rss-parser'
import type { FetchEnv } from './env'
import {
  FEED_CONFIGS,
  type FeedConfig,
  type NormalizedItem,
  normalizedItemSchema,
} from './feed-config'

const MAX_LENGTH = {
  media: 10,
  title: 100,
  author: 30,
  description: 1024,
}

// INFO: 外部RSSのハング時に無限待機しないよう1試行あたりのタイムアウトを設ける
const FETCH_TIMEOUT_MS = 30_000
// INFO: 一時的なネットワークエラーを吸収するためのリトライ回数（初回 + リトライ）
const MAX_FETCH_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 1_000
const RETRY_MAX_DELAY_MS = 30_000

function truncateByCodePoint(text: string, maxLength: number): string {
  return [...text].slice(0, maxLength).join('')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// 指数バックオフの待機時間(2^attempt × base)を算出し、上限でクランプする。
function backoffDelayMs(attempt: number): number {
  return Math.min(RETRY_BASE_DELAY_MS * 2 ** attempt, RETRY_MAX_DELAY_MS)
}

async function fetchRssFeedOnce<T>(url: string): Promise<Result<T[], Error>> {
  const responseResult = await wrapAsyncCall(() =>
    fetchWithTimeout(url, { timeoutMs: FETCH_TIMEOUT_MS }),
  )
  if (responseResult.isErr()) return err(responseResult.error)

  const response = responseResult.value
  if (!response.ok) {
    return err(new Error(`Failed to fetch rss feed: ${url}, status=${response.status}`))
  }

  const parser = new Parser<{ items: T[] }, T>()
  return wrapAsyncCall(async () => {
    const xml = await response.text()
    const feed = await parser.parseString(xml)
    return feed.items
  })
}

async function fetchRssFeed<T>(url: string): Promise<Result<T[], Error>> {
  let lastError: Error = new Error(`Failed to fetch rss feed: ${url}`)

  for (let attempt = 0; attempt < MAX_FETCH_ATTEMPTS; attempt += 1) {
    const result = await fetchRssFeedOnce<T>(url)
    if (result.isOk()) return result

    lastError = result.error
    // INFO: 最終試行後は待機せず失敗を返す
    if (attempt < MAX_FETCH_ATTEMPTS - 1) {
      await delay(backoffDelayMs(attempt))
    }
  }

  return err(lastError)
}

async function storeArticles(
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

// 1件の不正itemでメディア全体の取込を止めないよう、不正itemは警告ログを残してスキップする。
function selectValidItems(
  media: ArticleMedia,
  items: NormalizedItem[],
  logger: Logger,
): NormalizedItem[] {
  const validItems: NormalizedItem[] = []
  let skippedCount = 0

  for (const item of items) {
    const parsed = normalizedItemSchema.safeParse(item)
    if (!parsed.success) {
      skippedCount += 1
      logger.warn({
        msg: 'cron feed item skipped: validation failed',
        media,
        url: typeof item?.url === 'string' ? item.url : undefined,
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      })
      continue
    }
    validItems.push(parsed.data)
  }

  if (skippedCount > 0) {
    logger.warn({
      msg: 'cron feed items skipped',
      media,
      skippedCount,
      totalCount: items.length,
    })
  }

  return validItems
}

async function fetchAndStore<RawItem>(
  media: ArticleMedia,
  config: FeedConfig<RawItem>,
  env: FetchEnv,
  logger: Logger,
): Promise<Result<number, Error>> {
  const itemsResult = await fetchRssFeed<RawItem>(config.url)
  if (itemsResult.isErr()) return err(itemsResult.error)

  const validItems = selectValidItems(media, itemsResult.value.map(config.mapItem), logger)
  return storeArticles(media, validItems, env)
}

export function fetchQiitaArticles(env: FetchEnv, logger: Logger): Promise<Result<number, Error>> {
  return fetchAndStore('qiita', FEED_CONFIGS.qiita, env, logger)
}

export function fetchZennArticles(env: FetchEnv, logger: Logger): Promise<Result<number, Error>> {
  return fetchAndStore('zenn', FEED_CONFIGS.zenn, env, logger)
}

export function fetchHatenaArticles(env: FetchEnv, logger: Logger): Promise<Result<number, Error>> {
  return fetchAndStore('hatena', FEED_CONFIGS.hatena, env, logger)
}

const FETCHERS: Record<
  ArticleMedia,
  (env: FetchEnv, logger: Logger) => Promise<Result<number, Error>>
> = {
  qiita: fetchQiitaArticles,
  zenn: fetchZennArticles,
  hatena: fetchHatenaArticles,
}

export function runScheduledFetch(
  media: ArticleMedia,
  env: FetchEnv,
  logger: Logger,
): Promise<Result<number, Error>> {
  return FETCHERS[media](env, logger)
}
