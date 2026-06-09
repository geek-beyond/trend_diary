import type { LogLevel } from '@trend-diary/common/logger'

type D1Database = import('@cloudflare/workers-types').D1Database

export type FetchEnv = {
  DB: D1Database
  LOG_LEVEL?: LogLevel
}

export type CronEnv = FetchEnv & {
  DISCORD_WEBHOOK_URL: string
}
