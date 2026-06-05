import type { Client as LibSQLClient, Config as LibSQLConfig } from '@libsql/client'
import type { Logger as DrizzleLogger } from 'drizzle-orm'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { drizzle as drizzleLibsql, type LibSQLDatabase } from 'drizzle-orm/libsql'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import AppLogger, { type LogLevel } from '@/common/logger'
import * as schema from '@/infrastructure/drizzle-orm/schema'

type D1Database = import('@cloudflare/workers-types').D1Database

/**
 * `@libsql/client/node`（`file:`/リモートlibsql対応のNodeビルド）を生成する関数。
 *
 * Nodeビルドはネイティブモジュール `libsql` に依存し、モジュール評価時に
 * `requireNative` を実行する。これを静的importでバンドルに含めると、
 * Workersランタイム（workerd）の起動時にネイティブ読み込みが走り起動に失敗する。
 *
 * 一方で本番Workers（D1バインディング経路）では `file:` 分岐自体が実行されないため、
 * Nodeクライアントは不要。そこで「workerd以外（Node系: vite dev SSR/vitest/wrangler未起動の
 * Node実行）でのみ動的importする」ことで、workerdバンドルに `libsql` を含めず評価も走らせない。
 *
 * 判定は Cloudflare Workers が公開する `navigator.userAgent === 'Cloudflare-Workers'` の
 * 厳密一致で行う。Node 22 も `navigator`（userAgent は `Node.js/<major>`）を持つため、
 * 厳密一致でなければ誤検知する。
 *
 * @see https://github.com/libsql/libsql-client-ts#supported-urls
 */
const isWorkerd = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers'
const createLibSQLNodeClient: ((config: LibSQLConfig) => LibSQLClient) | null = isWorkerd
  ? null
  : (await import('@libsql/client/node')).createClient

type RdbConfig = {
  db?: D1Database
  databaseUrl?: string
}

type RdbInput = string | RdbConfig

// libsql / D1 / sqlite-proxy(テスト) は結果セット型のみ異なるため、結果セット型を
// unknown にした共通基底型を RdbClient として扱う。
export type RdbClient = BaseSQLiteDatabase<'async', unknown, typeof schema>

type RdbLibSQLClient = LibSQLDatabase<typeof schema> & {
  // biome-ignore lint/style/useNamingConvention: drizzleが公開する `$client` プロパティ名に合わせる
  $client: { close: () => void }
}

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

let queryLogger: DrizzleLogger | undefined

function resolveLogger(isTest: boolean): DrizzleLogger | false {
  if (isTest) return false
  if (!queryLogger) {
    queryLogger = new DrizzleQueryLogger()
  }
  return queryLogger
}

export default function getRdbClient(input: RdbInput): RdbClient {
  const isTest = process.env.NODE_ENV === 'test'
  const isStringInput = typeof input === 'string'
  const config: RdbConfig = isStringInput ? { databaseUrl: input } : input
  const processDatabaseUrl = process.env.DATABASE_URL?.trim()
  const configDatabaseUrl = config.databaseUrl?.trim()
  // INFO: 文字列入力(明示指定)は最優先、オブジェクト入力ではprocess.envを優先してE2E時の不一致を防ぐ
  const resolvedDatabaseUrl = isStringInput
    ? configDatabaseUrl || processDatabaseUrl || config.databaseUrl || process.env.DATABASE_URL
    : processDatabaseUrl || configDatabaseUrl || process.env.DATABASE_URL || config.databaseUrl

  const logger = resolveLogger(isTest)

  // INFO: E2E/ローカルSQLiteではDATABASE_URL(file:)を優先し、D1バインディングとの分離を防ぐ
  if (resolvedDatabaseUrl?.startsWith('file:')) {
    // INFO: `file:`はNodeビルド(`@libsql/client/node`)でのみ対応。workerd(本番)では実行されない経路
    if (!createLibSQLNodeClient) {
      throw new Error('file: database URL is not supported on the Workers runtime')
    }
    return drizzleLibsql(createLibSQLNodeClient({ url: resolvedDatabaseUrl }), {
      schema,
      logger,
    })
  }

  if (config.db) {
    return drizzleD1(config.db, {
      schema,
      logger,
    })
  }

  if (!resolvedDatabaseUrl) {
    throw new Error('Either D1 binding (db) or databaseUrl must be provided')
  }

  // INFO: file: 以外のURL(リモートlibsql等)もlibsqlドライバで接続する。
  // Nodeビルドが使えない環境(workerd)では到達し得ない経路のため、Nodeクライアントを利用する
  if (!createLibSQLNodeClient) {
    throw new Error('Remote libsql database URL is not supported on the Workers runtime')
  }
  return drizzleLibsql(createLibSQLNodeClient({ url: resolvedDatabaseUrl }), {
    schema,
    logger,
  })
}

// wrapAsyncCall の cleanup(finally)として呼ばれる(cron storeArticles)。ここで例外を送出すると
// 業務処理の結果を上書きして漏れるため、クローズ失敗は捕捉して warn ログに留める。
export function closeRdbClient(db: RdbClient): void {
  if (!hasClosableClient(db)) return

  try {
    db.$client.close()
  } catch (error) {
    getDrizzleLogger().warn({ msg: 'failed to close rdb client', err: error })
  }
}

function hasClosableClient(db: RdbClient): db is RdbClient & RdbLibSQLClient {
  const candidate = db as Partial<RdbLibSQLClient>
  return (
    typeof candidate.$client === 'object' &&
    candidate.$client !== null &&
    typeof candidate.$client.close === 'function'
  )
}
