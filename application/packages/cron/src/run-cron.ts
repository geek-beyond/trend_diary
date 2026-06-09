import type Logger from '@trend-diary/common/logger'
import { ARTICLE_MEDIA } from '@trend-diary/domain/article/media'
import type { DiscordWebhookClient } from '@trend-diary/notification'
import type { CronEnv } from './env'
import { runScheduledFetch } from './fetch-articles'

export type RunCronParams = {
  env: CronEnv
  logger: Logger
  discord: DiscordWebhookClient
  cron: string
  scheduledTime: number
}

// 全メディアを逐次取得・保存し、成否集計・ロギング・Discord通知を行う。
// 1件でも失敗した場合は throw して Cloudflare へジョブ失敗を伝播する。
export async function runCron({
  env,
  logger,
  discord,
  cron,
  scheduledTime,
}: RunCronParams): Promise<void> {
  const jobStartedAt = Date.now()

  try {
    let successCount = 0
    let failedCount = 0
    let insertedTotal = 0

    logger.info({
      msg: 'cron job started',
      scheduledTime,
      mediaCount: ARTICLE_MEDIA.length,
    })

    for (const media of ARTICLE_MEDIA) {
      const mediaStartedAt = Date.now()
      logger.info({ msg: 'cron media fetch started', media })

      const result = await runScheduledFetch(media, env)

      if (result.isErr()) {
        failedCount += 1
        const error = result.error
        logger.error(
          {
            msg: 'cron media fetch failed',
            media,
            durationMs: Date.now() - mediaStartedAt,
          },
          error,
        )
        await discord.sendMessage(
          `[trend-diary cron] fetch failed\ncron: ${cron}\nmedia: ${media}\nerror: ${error.message}`,
        )
        continue
      }

      const insertedCount = result.value
      successCount += 1
      insertedTotal += insertedCount
      logger.info({
        msg: 'cron media fetch completed',
        media,
        insertedCount,
        durationMs: Date.now() - mediaStartedAt,
      })
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    logger.error({ msg: 'cron job failed', durationMs: Date.now() - jobStartedAt }, error)
    await discord.sendMessage(`[trend-diary cron] job failed\ncron: ${cron}\nerror: ${message}`)
    throw error
  }
}
