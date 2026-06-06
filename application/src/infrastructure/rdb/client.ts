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
export default function getRdbClient(db: D1Database): RdbClient {
  return drizzleD1(db, { schema, logger: resolveLogger() })
}

type RdbSource = {
  DB?: D1Database
}

// env.DB(D1)から RdbClient を構築する。テストでも miniflare の D1 バインディングを
// 注入するため、本番・テストともこの単一経路を通る。undefined チェックをここへ集約し、
// 各ハンドラ側の分岐(未到達ブランチ)を増やさない。
export function resolveRdbClient(source: RdbSource): RdbClient {
  if (!source.DB) {
    throw new Error('D1 binding (db) is required')
  }
  return getRdbClient(source.DB)
}
