import type { D1Database } from '@cloudflare/workers-types'
import { type DrizzleD1Database, drizzle as drizzleD1 } from 'drizzle-orm/d1'
import * as schema from '../schema'
import { queryLogger } from './logger'

export type RdbClient = DrizzleD1Database<typeof schema>

export default function getRdbClient(db: D1Database): RdbClient {
  return drizzleD1(db, { schema, logger: queryLogger })
}
