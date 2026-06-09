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

    const job = (async () => {
      const jobStartedAt = Date.now()
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
            `[trend-diary cron] fetch failed\ncron: ${event.cron}\nmedia: ${media}\nerror: ${error.message}`,
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
        // 下位はResultで返し、throwは最上位のここだけ。
        // 失敗時はcron実行自体を失敗扱いにしてCloudflareへ伝播させる
        throw new Error(`cron job failed: ${failedCount}/${MEDIA_LIST.length} media failed`)
      }
    })()

    // waitUntilで実行時間を確保しつつ、awaitで失敗をscheduledの結果へ伝播させる
    ctx.waitUntil(job)
    await job
  },
}
