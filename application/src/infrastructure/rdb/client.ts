import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import { resolveLogger } from '@/infrastructure/rdb/logger'

type D1Database = import('@cloudflare/workers-types').D1Database

// libsql / D1 / sqlite-proxy(テスト) は結果セット型のみ異なるため、結果セット型を
// unknown にした共通基底型を RdbClient として扱う。
export type RdbClient = BaseSQLiteDatabase<'async', unknown, typeof schema>

// 本番は D1 専用。file:/libsql はテストコード(src/test)のみで利用し、本番バンドル(workerd)に
// libsql を含めない。
export default function getRdbClient(db: D1Database | undefined): RdbClient {
  if (!db) {
    throw new Error('D1 binding (db) is required')
  }
  return drizzleD1(db, { schema, logger: resolveLogger() })
}

type RdbSource = {
  rdbClient?: RdbClient
  DB?: D1Database
}

// 注入された rdbClient(テスト)を優先し、無ければ env.DB(D1)から構築する。
// 各ハンドラに `??` を散らすと未到達分岐が増え server カバレッジ(branch 80%)を割るため、
// 解決処理をこの一箇所へ集約する。
export function resolveRdbClient(source: RdbSource): RdbClient {
  return source.rdbClient ?? getRdbClient(source.DB)
}
