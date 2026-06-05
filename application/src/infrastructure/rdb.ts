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

/**
 * libsql / D1 双方のDrizzleインスタンスを共通に扱う型。
 *
 * `drizzle-orm/libsql` の `LibSQLDatabase`、`drizzle-orm/d1` の `DrizzleD1Database`、
 * さらにテスト用の `drizzle-orm/sqlite-proxy`（`SqliteRemoteDatabase`）は
 * いずれも `BaseSQLiteDatabase<'async', ...>` を継承する。結果セット型のみが
 * ドライバごとに異なるため、結果セット型を `unknown` にした共通基底型を
 * `RdbClient` として公開する。
 *
 * この型でクエリビルダ（select/insert/update/delete）、`db.all(sql\`...\`)`、
 * リレーショナルクエリ（`db.query.activeUsers.findFirst(...)`）を型安全に呼び出せる。
 */
export type RdbClient = BaseSQLiteDatabase<'async', unknown, typeof schema>

/**
 * libsql ドライバのDrizzleインスタンス（`$client` で生のlibsqlクライアントにアクセス可能）。
 * `closeRdbClient` での接続クローズ判定に使用する。
 */
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

/**
 * `LOG_LEVEL` 環境変数を解決する。未設定/不正値の場合は本番想定の `info` を既定とする。
 *
 * `info` 既定により、クエリログ（debug）は `LOG_LEVEL=debug`（または `trace`）が
 * 明示的に指定されたときだけ出力される。これによりPII（email等）を含むSQL paramsが
 * 本番で常時ログ出力される事故を防ぐ。
 */
function resolveLogLevel(): LogLevel {
  const candidate = process.env.LOG_LEVEL?.trim()
  return VALID_LOG_LEVELS.includes(candidate as LogLevel) ? (candidate as LogLevel) : 'info'
}

// INFO: getRdbClient/closeRdbClient毎の生成を避けるため、drizzle用ロガーはモジュールレベルの遅延シングルトンで保持する
let drizzleLogger: AppLogger | undefined

/**
 * drizzle コンポーネント用の `AppLogger` を遅延生成して返すシングルトン。
 *
 * レベルは `resolveLogLevel()`（既定 `info`）で決定し、`AppLogger`（pino）の
 * レベルフィルタに出力可否を委譲する。`debug` ログはレベルが `debug`/`trace` の
 * ときだけ実出力される。
 */
function getDrizzleLogger(): AppLogger {
  if (!drizzleLogger) {
    drizzleLogger = new AppLogger(resolveLogLevel(), { component: 'drizzle' })
  }
  return drizzleLogger
}

/**
 * Drizzle の `logger` オプションに渡す構造化ロガー。
 *
 * Drizzle の logger はSQLクエリログのみを扱う。クエリの `params` には email 等の
 * PII が含まれ得るため、本番（`LOG_LEVEL` 未設定 = `info`）では出力させない。
 *
 * 出力ゲートは `AppLogger`（pino）のレベルフィルタに委譲する。`AppLogger` は
 * コンストラクタで受け取ったレベルを pino の `level` に設定し、それ未満のログを
 * pino 自身がドロップする。そのため、解決した `LOG_LEVEL` を AppLogger に渡せば、
 * `LOG_LEVEL` が `debug`/`trace` のときだけ `logQuery` の debug ログが実出力される。
 */
class DrizzleQueryLogger implements DrizzleLogger {
  logQuery(query: string, params: unknown[]): void {
    getDrizzleLogger().debug({ msg: 'drizzle query', query, params })
  }
}

// INFO: getRdbClient毎の生成を避けるため、Drizzleロガーもモジュールレベルの遅延シングルトンで保持する
let queryLogger: DrizzleLogger | undefined

/**
 * Drizzle に渡すロガーを解決する。
 *
 * - テスト環境（`NODE_ENV === 'test'`）: クエリログを完全に無効化（`false`）する。
 * - それ以外: 遅延生成したシングルトンの `DrizzleQueryLogger` を返す。実際に
 *   クエリログが出力されるかは `LOG_LEVEL`（既定 `info`）に依存し、`debug`/`trace`
 *   のときのみ出力される。
 */
function resolveLogger(isTest: boolean): DrizzleLogger | false {
  if (isTest) return false
  if (!queryLogger) {
    queryLogger = new DrizzleQueryLogger()
  }
  return queryLogger
}

/**
 * RDBクライアント（Drizzle）を生成する。
 *
 * 接続先の解決優先順位は移行前（Prisma実装）と完全に同一:
 * - 文字列入力（明示指定）は最優先で、その値を `databaseUrl` として扱う。
 * - オブジェクト入力では `process.env.DATABASE_URL` を優先し、E2E時の不一致を防ぐ。
 * - `file:` で始まるURLは D1 バインディングより優先する（ローカル/テスト用SQLite）。
 *
 * - `file:` URL  → `drizzle-orm/libsql`（`@libsql/client`）
 * - D1 バインディング → `drizzle-orm/d1`
 */
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

/**
 * libsql クライアントの接続を閉じる。
 *
 * - libsql: `$client.close()` を呼び出して接続を解放する。
 * - D1 / その他($clientを持たないインスタンス): 明示的なクローズは不要のため no-op。
 *
 * `RdbClient` は共通基底型のため `$client` を直接持たない。実体が libsql の場合のみ
 * `$client.close` が存在するので、型ガードで安全に分岐する。
 *
 * クローズ失敗は握りつぶす（warnログのみ）。本関数は `wrapAsyncCall` の cleanup として
 * `finally` 経由で呼ばれる（cron `storeArticles`）ため、ここで例外を送出すると業務処理の
 * 結果（成功/本来のエラー）を上書きして外へ漏れてしまう。接続クローズの失敗で業務処理を
 * 失敗させないため、例外は捕捉してログに留める。
 */
export function closeRdbClient(db: RdbClient): void {
  if (!hasClosableClient(db)) return

  try {
    db.$client.close()
  } catch (error) {
    getDrizzleLogger().warn({ msg: 'failed to close rdb client', err: error })
  }
}

/**
 * 実体が libsql ドライバのインスタンス（`$client.close` を持つ）かを判定する型ガード。
 */
function hasClosableClient(db: RdbClient): db is RdbClient & RdbLibSQLClient {
  const candidate = db as Partial<RdbLibSQLClient>
  return (
    typeof candidate.$client === 'object' &&
    candidate.$client !== null &&
    typeof candidate.$client.close === 'function'
  )
}
