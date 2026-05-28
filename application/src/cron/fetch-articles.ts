import Parser from 'rss-parser'
import { isFailure, wrapAsyncCall } from '@/common/result'
import type { ArticleMedia } from '@/domain/article/media'
import getRdbClient from '@/infrastructure/rdb'

type CronEnv = {
  DB: D1Database
  DATABASE_URL?: string
  LOG_LEVEL?: import('@/common/logger').LogLevel
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
  const db = getRdbClient({ db: env.DB, databaseUrl: env.DATABASE_URL })
  const result = await wrapAsyncCall(
    async () => {
      if (items.length === 0) return 0

      const normalized = items.map((item) => ({
        media: truncateByCodePoint(media, MAX_LENGTH.media),
        title: truncateByCodePoint(item.title, MAX_LENGTH.title),
        author: truncateByCodePoint(item.author, MAX_LENGTH.author),
        description: truncateByCodePoint(item.description, MAX_LENGTH.description),
        url: item.url,
      }))

      const existing = await db.article.findMany({
        where: {
          url: {
            in: normalized.map((item) => item.url),
          },
        },
        select: {
          url: true,
        },
      })

      const existingUrlSet = new Set(existing.map((item) => item.url))
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
        try {
          await db.article.create({
            data: article,
          })
          insertedCount += 1
        } catch (error) {
          if (isUniqueConstraintError(error)) continue
          throw error
        }
      }

      return insertedCount
    },
    () => db.$disconnect(),
  )
  if (isFailure(result)) {
    throw result.error
  }
  return result.value
}

function isUniqueConstraintError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  const errorWithCode = error as { code?: unknown }
  return errorWithCode.code === 'P2002'
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
