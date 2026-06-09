import type { D1Database } from '@cloudflare/workers-types'
import type { LogLevel } from '@trend-diary/common/logger'

export interface FetchEnv {
  DB: D1Database
  LOG_LEVEL?: LogLevel
}

export interface CronEnv extends FetchEnv {
  DISCORD_WEBHOOK_URL: string
}
