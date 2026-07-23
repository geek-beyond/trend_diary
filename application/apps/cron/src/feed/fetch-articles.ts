import type { ArticleMedia } from '@trend-diary/domain/article/media'
import type Logger from '@trend-diary/logger'
import { err, ok, type Result } from 'neverthrow'
import type { FetchEnv } from '../env'
import { type ArticleOgImageEntry, storeArticles, updateArticleOgImageUrls } from './article-store'
import { FEED_CONFIGS, type FeedConfig, type NormalizedItem, normalizedItemSchema } from './config'
import { fetchOgImageUrl } from './og-image'
import { fetchRssFeed } from './rss-client'

// 記事ページへの一斉アクセスを避けつつ、逐次では新着数十件で遅くなりすぎない程度の並列度
const OG_IMAGE_FETCH_CONCURRENCY = 5

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

// og:image の解決に失敗した記事はエントリから外れ、og_image_url は NULL のまま（プレースホルダー表示）になる
async function resolveOgImageEntries(urls: string[]): Promise<ArticleOgImageEntry[]> {
  const entries: ArticleOgImageEntry[] = []
  for (let i = 0; i < urls.length; i += OG_IMAGE_FETCH_CONCURRENCY) {
    const chunkUrls = urls.slice(i, i + OG_IMAGE_FETCH_CONCURRENCY)
    const results = await Promise.all(
      chunkUrls.map(async (url) => ({ url, ogImageUrl: await fetchOgImageUrl(url) })),
    )
    for (const result of results) {
      if (result.ogImageUrl !== null)
        entries.push({ url: result.url, ogImageUrl: result.ogImageUrl })
    }
  }
  return entries
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
  const storeResult = await storeArticles(media, validItems, env)
  if (storeResult.isErr()) return err(storeResult.error)
  const insertedUrls = storeResult.value

  // 画像は新規挿入分だけ解決する（既存URLは ON CONFLICT でスキップ済みで、再取得の必要がない）
  const ogImageEntries = await resolveOgImageEntries(insertedUrls)
  const updateResult = await updateArticleOgImageUrls(ogImageEntries, env)
  if (updateResult.isErr()) return err(updateResult.error)

  return ok(insertedUrls.length)
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
