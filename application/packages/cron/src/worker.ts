import Logger from '@trend-diary/common/logger'
import { DiscordWebhookClient } from '@trend-diary/notification'
import type { CronEnv } from './env'
import { runCron } from './run-cron'

export default {
  async scheduled(event: ScheduledController, env: CronEnv, ctx: ExecutionContext) {
    const logger = new Logger(env.LOG_LEVEL || 'info', {
      scope: 'cron-worker',
      cron: event.cron,
    })

    const discord = new DiscordWebhookClient(env.DISCORD_WEBHOOK_URL)

    ctx.waitUntil(
      runCron({
        env,
        logger,
        discord,
        cron: event.cron,
        scheduledTime: event.scheduledTime,
      }),
    )
  },
}
