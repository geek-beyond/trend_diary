import type { D1Database } from '@cloudflare/workers-types'
import type { WorkerBindings } from '@trend-diary/common/env'
import type { LogLevel } from '@trend-diary/common/logger'

export interface FetchEnv {
  DB: D1Database
  LOG_LEVEL?: LogLevel
}

export type CronEnv = WorkerBindings
