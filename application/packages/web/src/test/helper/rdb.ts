import * as schema from '@trend-diary/datastore/drizzle-orm/schema'
import type { RdbClient } from '@trend-diary/datastore/rdb'
import { drizzle } from 'drizzle-orm/d1'
import { platformEnv } from '@/test/setup/platform-proxy'

export const testRdb: RdbClient = drizzle(platformEnv.DB, { schema })
