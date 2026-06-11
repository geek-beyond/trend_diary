import type Logger from '@trend-diary/common/logger'
import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import type { DiscordWebhookClient } from '@trend-diary/notification'
import { err, type Result } from 'neverthrow'
import type { CronEnv } from './env'
import { runScheduledFetch } from './fetch-articles'

export interface FetchAllArticlesParams {
  env: CronEnv
  logger: Logger
  discord: DiscordWebhookClient
  cron: string
  scheduledTime: number
}

interface MediaFetchOutcome {
  media: ArticleMedia
  result: Result<number, Error>
  durationMs: number
}

export async function fetchAllArticles({
  env,
  logger,
  discord,
  cron,
  scheduledTime,
}: FetchAllArticlesParams): Promise<void> {
  const jobStartedAt = Date.now()

  let successCount = 0
  let failedCount = 0
  let insertedTotal = 0

  logger.info({
    msg: 'cron job started',
    scheduledTime,
    mediaCount: ARTICLE_MEDIA.length,
  })

  // フィード取得はI/O待ちが支配的なため、メディア単位で並列実行して壁時計時間を短縮する
  // runScheduledFetch はResultを返し原則rejectしないが、想定外の例外も失敗として扱い所要時間を正確に記録する
  const outcomes = await Promise.all(
    ARTICLE_MEDIA.map(async (media): Promise<MediaFetchOutcome> => {
      const mediaStartedAt = Date.now()
      logger.info({ msg: 'cron media fetch started', media })
      try {
        const result = await runScheduledFetch(media, env, logger)
        return { media, result, durationMs: Date.now() - mediaStartedAt }
      } catch (e) {
        const error = e instanceof Error ? e : new Error(String(e))
        return { media, result: err(error), durationMs: Date.now() - mediaStartedAt }
      }
    }),
  )

  // Discord通知とログ集計は全件完了後にまとめて行い、並列フェッチと副作用を分離する
  for (const { media, result, durationMs } of outcomes) {
    if (result.isErr()) {
      failedCount += 1
      const error = result.error
      logger.error({ msg: 'cron media fetch failed', media, durationMs }, error)
      await discord.sendMessage(
        `[trend-diary cron] fetch failed\ncron: ${cron}\nmedia: ${media}\nerror: ${error.message}`,
      )
      continue
    }

    const insertedCount = result.value
    successCount += 1
    insertedTotal += insertedCount
    logger.info({ msg: 'cron media fetch completed', media, insertedCount, durationMs })
  }

  logger.info({
    msg: 'cron job completed',
    successCount,
    failedCount,
    insertedTotal,
    durationMs: Date.now() - jobStartedAt,
  })

  if (failedCount > 0) {
    throw new Error(`cron job failed: ${failedCount}/${ARTICLE_MEDIA.length} media failed`)
  }
}
