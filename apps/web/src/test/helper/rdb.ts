import type { RdbClient } from '@trend-diary/datastore/rdb'
import * as schema from '@trend-diary/datastore/schema'
import { drizzle } from 'drizzle-orm/d1'
import { platformEnv } from '@/test/setup/platform-proxy'

export const testRdb: RdbClient = drizzle(platformEnv.DB, { schema })
