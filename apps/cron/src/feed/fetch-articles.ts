import type { ArticleMedia } from '@trend-diary/domain/article/media'
import type Logger from '@trend-diary/logger'
import { err, type Result } from 'neverthrow'
import type { FetchEnv } from '../env'
import { type ArticleWithOgImage, storeArticles } from './article-store'
import { FEED_CONFIGS, type FeedConfig, type NormalizedItem, normalizedItemSchema } from './config'
import { fetchOgImageUrl } from './og-image'
import { fetchRssFeed } from './rss-client'

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

// 記事ページへ1件ずつアクセスして og:image を解決する。取得・抽出に失敗した記事は
// ogImageUrl を null で残し（プレースホルダー表示）、記事自体は取り込む
async function resolveOgImages(items: NormalizedItem[]): Promise<ArticleWithOgImage[]> {
  const resolved: ArticleWithOgImage[] = []
  for (const item of items) {
    resolved.push({ ...item, ogImageUrl: await fetchOgImageUrl(item.url) })
  }
  return resolved
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
  // 記事と og:image をまとめて解決してから1回のバッチで挿入する（挿入後に画像を追記する二段にしない）
  const itemsWithOgImage = await resolveOgImages(validItems)
  return storeArticles(media, itemsWithOgImage, env)
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
