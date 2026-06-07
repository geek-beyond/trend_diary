import { inArray } from 'drizzle-orm'
import Parser from 'rss-parser'
import type { ArticleMedia } from '@/domain/article/media'
import { articles } from '@/infrastructure/drizzle-orm/schema'
import getRdbClient, { wrapDbCall } from '@/infrastructure/rdb'

type CronEnv = {
  DB: D1Database
  LOG_LEVEL?: import('@trend-diary/common/logger').LogLevel
}

type D1Database = import('@cloudflare/workers-types').D1Database

type FeedItem = {
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
const HATENA_FALLBACK_AUTHOR = 'はてなブックマーク'

function truncateByCodePoint(text: string, maxLength: number): string {
  return [...text].slice(0, maxLength).join('')
}

function pickNonEmpty(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (trimmed.length > 0) return trimmed
  }
  return undefined
}

async function fetchRssFeed<T>(url: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch rss feed: ${url}, status=${response.status}`)
  }

  const parser = new Parser<{ items: T[] }, T>()
  const xml = await response.text()
  const feed = await parser.parseString(xml)
  return feed.items
}

async function storeArticles(media: ArticleMedia, items: FeedItem[], env: CronEnv) {
  const db = getRdbClient(env.DB)
  if (items.length === 0) return 0

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
    throw existingResult.error
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

  if (toInsert.length === 0) return 0

  let insertedCount = 0
  for (const article of toInsert) {
    // INFO: D1互換のため記事は1件ずつ保存する
    const insertResult = await wrapDbCall(() => db.insert(articles).values(article))
    if (insertResult.isErr()) {
      if (isUniqueConstraintError(insertResult.error)) continue
      throw insertResult.error
    }
    insertedCount += 1
  }

  return insertedCount
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

export async function fetchQiitaArticles(env: CronEnv): Promise<number> {
  const items = await fetchRssFeed<{
    title: string
    author: string
    content: string
    link: string
  }>('https://qiita.com/popular-items/feed.atom')

  return storeArticles(
    'qiita',
    items.map((item) => ({
      title: item.title,
      author: item.author,
      description: item.content,
      url: item.link,
    })),
    env,
  )
}

export async function fetchZennArticles(env: CronEnv): Promise<number> {
  const items = await fetchRssFeed<{
    title: string
    creator: string
    content: string
    link: string
  }>('https://zenn.dev/feed')

  return storeArticles(
    'zenn',
    items.map((item) => ({
      title: item.title,
      author: item.creator,
      description: item.content,
      url: item.link,
    })),
    env,
  )
}

export async function fetchHatenaArticles(env: CronEnv): Promise<number> {
  const items = await fetchRssFeed<{
    title: string
    creator?: string
    content?: string
    'content:encoded'?: string
    contentSnippet?: string
    link: string
  }>('https://b.hatena.ne.jp/hotentry/it.rss')

  return storeArticles(
    'hatena',
    items.map((item) => ({
      title: item.title,
      author: pickNonEmpty(item.creator) || HATENA_FALLBACK_AUTHOR,
      description: pickNonEmpty(item.content, item['content:encoded'], item.contentSnippet) || '',
      url: item.link,
    })),
    env,
  )
}

export async function runScheduledFetch(media: ArticleMedia, env: CronEnv): Promise<number> {
  let insertedCount: number
  if (media === 'qiita') {
    insertedCount = await fetchQiitaArticles(env)
  } else if (media === 'zenn') {
    insertedCount = await fetchZennArticles(env)
  } else {
    insertedCount = await fetchHatenaArticles(env)
  }

  return insertedCount
}
