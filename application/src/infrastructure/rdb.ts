import type { Client as LibSQLClient, Config as LibSQLConfig } from '@libsql/client'
import type { Logger as DrizzleLogger } from 'drizzle-orm'
import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import type { Result } from 'neverthrow'
import AppLogger, { type LogLevel } from '@/common/logger'
import { wrapAsyncCall } from '@/common/result'
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
// file:(libsql)を使うのはテスト系のみで、それらは常に DATABASE_URL を供給する。dev/本番(D1)は
// DATABASE_URL 未設定のため、未設定時は import せずネイティブモジュール(libsql)のロードを避ける。
const createLibSQLNodeClient: ((config: LibSQLConfig) => LibSQLClient) | null =
  isWorkerd || !process.env.DATABASE_URL?.trim()
    ? null
    : (await import('@libsql/client/node')).createClient

// Drizzle はドライバ例外を DrizzleQueryError でラップし元例外を cause に格納する。
// ラッパのメッセージは `Failed query: ...` で元のDBエラー文言が失われるため、cause を取り出す。
function unwrapDbError(error: Error): Error {
  return error.cause instanceof Error ? error.cause : error
}

export function wrapDbCall<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
  return wrapAsyncCall(fn).then((result) => result.mapErr(unwrapDbError))
}

type RdbConfig = {
  db?: D1Database
  databaseUrl?: string
}

type RdbInput = string | RdbConfig

// libsql / D1 / sqlite-proxy(テスト) は結果セット型のみ異なるため、結果セット型を
// unknown にした共通基底型を RdbClient として扱う。
export type RdbClient = BaseSQLiteDatabase<'async', unknown, typeof schema>

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
  const config: RdbConfig = typeof input === 'string' ? { databaseUrl: input } : input
  const databaseUrl = config.databaseUrl?.trim() || process.env.DATABASE_URL?.trim()

  const logger = resolveLogger(isTest)

  // INFO: file:(libsql)はD1より優先する。E2EではviteアダプタがD1バインディングも供給するため、
  //       優先しないと test.db への分離が壊れる
  if (databaseUrl?.startsWith('file:')) {
    // INFO: `file:`はNodeビルド(`@libsql/client/node`)でのみ対応。workerd(本番)では実行されない経路。
    //       Node実行でも DATABASE_URL 未設定だとクライアント未ロードのため、その旨も案内する
    if (!createLibSQLNodeClient) {
      throw new Error(
        'file: database URL requires the Node libsql client, which is only loaded when DATABASE_URL is set (not available on the Workers runtime)',
      )
    }
    return drizzleLibsql(createLibSQLNodeClient({ url: databaseUrl }), { schema, logger })
  }

  if (config.db) {
    return drizzleD1(config.db, { schema, logger })
  }

  if (!databaseUrl) {
    throw new Error('Either D1 binding (db) or databaseUrl must be provided')
  }

  // INFO: file: 以外のURL(リモートlibsql等)もlibsqlドライバで接続する。
  // Nodeビルドが使えない環境(workerd)では到達し得ない経路のため、Nodeクライアントを利用する
  if (!createLibSQLNodeClient) {
    throw new Error('Remote libsql database URL is not supported on the Workers runtime')
  }
  return drizzleLibsql(createLibSQLNodeClient({ url: databaseUrl }), { schema, logger })
}
