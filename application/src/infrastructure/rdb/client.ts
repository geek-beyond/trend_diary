import { type DrizzleD1Database, drizzle as drizzleD1 } from 'drizzle-orm/d1'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import { queryLogger } from '@/infrastructure/rdb/logger'

type D1Database = import('@cloudflare/workers-types').D1Database

export type RdbClient = DrizzleD1Database<typeof schema>

export default function getRdbClient(db: D1Database): RdbClient {
  return drizzleD1(db, { schema, logger: queryLogger })
}
