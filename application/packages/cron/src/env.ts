import type { LogLevel } from '@trend-diary/common/logger'

type D1Database = import('@cloudflare/workers-types').D1Database

// fetch-articles が必要とする最小 env（テストが渡す { DB } を受けられる）
export type FetchEnv = {
  DB: D1Database
  LOG_LEVEL?: LogLevel
}

// scheduled handler 全体で必要となる env
export type CronEnv = FetchEnv & {
  DISCORD_WEBHOOK_URL: string
}
