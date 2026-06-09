import { wrapAsyncCall } from '@trend-diary/common/result'
import type { ArticleMedia } from '@trend-diary/domain/article/media'
import { err, type Result } from 'neverthrow'
import Parser from 'rss-parser'
import { type CronEnv, storeArticles } from './store-articles'

const HATENA_FALLBACK_AUTHOR = 'はてなブックマーク'

function pickNonEmpty(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (trimmed.length > 0) return trimmed
  }
  return undefined
}

async function fetchRssFeed<T>(url: string): Promise<Result<T[], Error>> {
  const responseResult = await wrapAsyncCall(() => fetch(url))
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

export async function fetchQiitaArticles(env: CronEnv): Promise<Result<number, Error>> {
  const itemsResult = await fetchRssFeed<{
    title: string
    author: string
    content: string
    link: string
  }>('https://qiita.com/popular-items/feed.atom')
  if (itemsResult.isErr()) return err(itemsResult.error)

  return storeArticles(
    'qiita',
    itemsResult.value.map((item) => ({
      title: item.title,
      author: item.author,
      description: item.content,
      url: item.link,
    })),
    env,
  )
}

export async function fetchZennArticles(env: CronEnv): Promise<Result<number, Error>> {
  const itemsResult = await fetchRssFeed<{
    title: string
    creator: string
    content: string
    link: string
  }>('https://zenn.dev/feed')
  if (itemsResult.isErr()) return err(itemsResult.error)

  return storeArticles(
    'zenn',
    itemsResult.value.map((item) => ({
      title: item.title,
      author: item.creator,
      description: item.content,
      url: item.link,
    })),
    env,
  )
}

export async function fetchHatenaArticles(env: CronEnv): Promise<Result<number, Error>> {
  const itemsResult = await fetchRssFeed<{
    title: string
    creator?: string
    content?: string
    'content:encoded'?: string
    contentSnippet?: string
    link: string
  }>('https://b.hatena.ne.jp/hotentry/it.rss')
  if (itemsResult.isErr()) return err(itemsResult.error)

  return storeArticles(
    'hatena',
    itemsResult.value.map((item) => ({
      title: item.title,
      author: pickNonEmpty(item.creator) || HATENA_FALLBACK_AUTHOR,
      description: pickNonEmpty(item.content, item['content:encoded'], item.contentSnippet) || '',
      url: item.link,
    })),
    env,
  )
}

export function runScheduledFetch(
  media: ArticleMedia,
  env: CronEnv,
): Promise<Result<number, Error>> {
  if (media === 'qiita') {
    return fetchQiitaArticles(env)
  }
  if (media === 'zenn') {
    return fetchZennArticles(env)
  }
  return fetchHatenaArticles(env)
}
