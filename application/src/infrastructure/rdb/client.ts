import { drizzle as drizzleD1 } from 'drizzle-orm/d1'
import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import { resolveLogger } from '@/infrastructure/rdb/logger'

type D1Database = import('@cloudflare/workers-types').D1Database

export type RdbClient = BaseSQLiteDatabase<'async', unknown, typeof schema>

export default function getRdbClient(db: D1Database | undefined): RdbClient {
  if (!db) {
    throw new Error('D1 binding (db) is required')
  }
  return drizzleD1(db, { schema, logger: resolveLogger() })
}
