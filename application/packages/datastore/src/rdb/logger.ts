import AppLogger, { type LogLevel } from '@trend-diary/logger'
import type { Logger as DrizzleLogger } from 'drizzle-orm'
import { maskQueryParams } from './mask'

const VALID_LOG_LEVELS: ReadonlyArray<LogLevel> = [
  'trace',
  'debug',
  'info',
  'warn',
  'error',
  'fatal',
  'silent',
]

export function isLogLevel(value: string | undefined): value is LogLevel {
  const validLevels: ReadonlyArray<string> = VALID_LOG_LEVELS
  return value !== undefined && validLevels.includes(value)
}

// 既定を info にすることで、PII(email等)を含むクエリログ(debug)は LOG_LEVEL=debug/trace
// を明示したときだけ出力され、本番で常時ログ出力される事故を防ぐ。
export function resolveLogLevel(): LogLevel {
  const candidate = process.env.LOG_LEVEL?.trim()
  return isLogLevel(candidate) ? candidate : 'info'
}

let drizzleLogger: AppLogger | undefined

function getDrizzleLogger(): AppLogger {
  if (!drizzleLogger) {
    drizzleLogger = new AppLogger(resolveLogLevel(), { component: 'drizzle' })
  }
  return drizzleLogger
}

// クエリの params には email 等の PII が含まれ得るため、(1)出力ゲートを AppLogger(pino) の
// レベルフィルタに委譲して debug ログを LOG_LEVEL=debug/trace のときだけ実出力させ、
// (2)さらに文字列の bind 値をマスクして、debug 出力時にも PII がログ基盤へ流出しないようにする。
class DrizzleQueryLogger implements DrizzleLogger {
  // oxlint-disable-next-line typescript/no-restricted-types -- Drizzle の Logger インターフェースが定める型で、任意のカラム値が渡るため具象化できないためです
  logQuery(query: string, params: unknown[]): void {
    getDrizzleLogger().debug({ msg: 'drizzle query', query, params: maskQueryParams(params) })
  }
}

export const queryLogger: DrizzleLogger = new DrizzleQueryLogger()
