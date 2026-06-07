import AppLogger, { type LogLevel } from '@trend-diary/common/logger'
import type { Logger as DrizzleLogger } from 'drizzle-orm'

const VALID_LOG_LEVELS: ReadonlyArray<LogLevel> = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
]

// 既定を info にすることで、PII(email等)を含むクエリログ(debug)は LOG_LEVEL=debug/trace
// を明示したときだけ出力され、本番で常時ログ出力される事故を防ぐ。
function resolveLogLevel(): LogLevel {
  const candidate = process.env.LOG_LEVEL?.trim()
  return VALID_LOG_LEVELS.includes(candidate as LogLevel) ? (candidate as LogLevel) : 'info'
}

let drizzleLogger: AppLogger | undefined

function getDrizzleLogger(): AppLogger {
  if (!drizzleLogger) {
    drizzleLogger = new AppLogger(resolveLogLevel(), { component: 'drizzle' })
  }
  return drizzleLogger
}

// クエリの params には email 等の PII が含まれ得るため、出力ゲートを AppLogger(pino) の
// レベルフィルタに委譲し、debug ログは LOG_LEVEL=debug/trace のときだけ実出力させる。
class DrizzleQueryLogger implements DrizzleLogger {
  logQuery(query: string, params: unknown[]): void {
    getDrizzleLogger().debug({ msg: 'drizzle query', query, params })
  }
}

export const queryLogger: DrizzleLogger = new DrizzleQueryLogger()
