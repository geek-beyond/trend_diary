import * as schema from '@trend-diary/datastore/drizzle-orm/schema'
import type { RdbClient } from '@trend-diary/datastore/rdb'
import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'

export const testRdb: RdbClient = drizzle(env.DB, { schema })
