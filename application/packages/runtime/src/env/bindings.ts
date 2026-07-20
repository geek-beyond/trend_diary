import type { D1Database } from '@cloudflare/workers-types'
import type { LogLevel } from '@trend-diary/logger'

export interface WorkerBindings {
  DB: D1Database
  DISCORD_WEBHOOK_URL: string
  LOG_LEVEL?: LogLevel
}
