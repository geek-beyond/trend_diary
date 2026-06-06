import { env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import type { RdbClient } from '@/infrastructure/rdb'

// pool-workers のユニットテストは workerd 内で動くため、cloudflare:test の env.DB が本物の D1。
// E2E(node)はこのモジュールを使わず、専用 fixture から miniflare の D1 を得る。
export const testRdb: RdbClient = drizzle(env.DB, { schema })
