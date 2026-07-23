import Logger from '@trend-diary/logger'
import { DiscordWebhookClient } from '@trend-diary/notification'
import type { CronEnv } from './env'
import { fetchAllArticles } from './feed/fetch-all-articles'

export default {
  async scheduled(event: ScheduledController, env: CronEnv, ctx: ExecutionContext) {
    const logger = new Logger(env.LOG_LEVEL || 'info', {
      scope: 'cron-worker',
      cron: event.cron,
    })

    const discord = new DiscordWebhookClient(env.DISCORD_WEBHOOK_URL, logger)

    ctx.waitUntil(
      fetchAllArticles({
        env,
        logger,
        discord,
        cron: event.cron,
        scheduledTime: event.scheduledTime,
      }),
    )
  },
}
