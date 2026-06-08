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
    const discord = new DiscordWebhookClient(env.DISCORD_WEBHOOK_URL)

    ctx.waitUntil(
      (async () => {
        const jobStartedAt = Date.now()
        let logger: Logger | undefined

        try {
          logger = new Logger(env.LOG_LEVEL || 'info', {
            scope: 'cron-worker',
            cron: event.cron,
          })

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
          // 個別 media の失敗はループ内で捕捉済みのため、ここに到達するのは
          // ジョブ全体を巻き込む予期しない失敗(ロガー初期化やループ外の例外など)。
          // ロガーが壊れていても通知だけは欠かさないよう、Discord 送信を最優先する。
          const message = error instanceof Error ? error.message : String(error)
          await discord.sendMessage(
            `[trend-diary cron] job failed\ncron: ${event.cron}\nerror: ${message}`,
          )
          logger?.error({ msg: 'cron job failed', durationMs: Date.now() - jobStartedAt }, error)
          // Cloudflare 側でも失敗として記録させるため再スローする
          throw error
        }
      })(),
    )
  },
}
