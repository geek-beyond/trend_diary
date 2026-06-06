import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import { resolveLogger } from '@/infrastructure/rdb/logger'

type D1Database = import('@cloudflare/workers-types').D1Database

// D1 / sqlite-proxy は結果セット型のみ異なるため、結果セット型を unknown にした
// 共通基底型を RdbClient として扱う。
export type RdbClient = BaseSQLiteDatabase<'async', unknown, typeof schema>

// D1 バインディングから RdbClient を構築する。
export default function getRdbClient(db: D1Database): RdbClient {
  return drizzleD1(db, { schema, logger: resolveLogger() })
}
