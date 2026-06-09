import Logger from '@trend-diary/common/logger'
import type { ArticleMedia } from '@trend-diary/domain/article/media'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { runScheduledFetch } from './fetch-articles'

type D1Database = import('@cloudflare/workers-types').D1Database

type CronWorkerEnv = {
  DB: D1Database
  DISCORD_WEBHOOK_URL: string
  LOG_LEVEL?: import('@trend-diary/common/logger').LogLevel
}

const MEDIA_LIST: ReadonlyArray<ArticleMedia> = ['qiita', 'zenn', 'hatena']

export default {
  async scheduled(event: ScheduledController, env: CronWorkerEnv, ctx: ExecutionContext) {
    const logger = new Logger(env.LOG_LEVEL || 'info', {
      scope: 'cron-worker',
      cron: event.cron,
    })

    const discord = new DiscordWebhookClient(env.DISCORD_WEBHOOK_URL)

    ctx.waitUntil(
      (async () => {
        const jobStartedAt = Date.now()

        try {
          let successCount = 0
          let failedCount = 0
          let insertedTotal = 0

          logger.info({
            msg: 'cron job started',
            scheduledTime: event.scheduledTime,
            mediaCount: MEDIA_LIST.length,
          })

          for (const media of MEDIA_LIST) {
            const mediaStartedAt = Date.now()
            logger.info({ msg: 'cron media fetch started', media })

            try {
              const insertedCount = await runScheduledFetch(media, env)
              successCount += 1
              insertedTotal += insertedCount
              logger.info({
                msg: 'cron media fetch completed',
                media,
                insertedCount,
                durationMs: Date.now() - mediaStartedAt,
              })
            } catch (error) {
              failedCount += 1
              const message = error instanceof Error ? error.message : String(error)
              logger.error(
                {
                  msg: 'cron media fetch failed',
                  media,
                  durationMs: Date.now() - mediaStartedAt,
                },
                error,
              )
              await discord.sendMessage(
                `[trend-diary cron] fetch failed\ncron: ${event.cron}\nmedia: ${media}\nerror: ${message}`,
              )
            }
          }

          logger.info({
            msg: 'cron job completed',
            successCount,
            failedCount,
            insertedTotal,
            durationMs: Date.now() - jobStartedAt,
          })
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          logger.error({ msg: 'cron job failed', durationMs: Date.now() - jobStartedAt }, error)
          await discord.sendMessage(
            `[trend-diary cron] job failed\ncron: ${event.cron}\nerror: ${message}`,
          )
          // Cloudflare 側でも失敗として記録させるため再スローする
          throw error
        }
      })(),
    )
  },
}
