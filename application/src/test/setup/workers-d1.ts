import { applyD1Migrations, env } from 'cloudflare:test'
import { drizzle } from 'drizzle-orm/d1'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import { setTestD1, setTestRdb } from '@/test/helper/rdb'

// pool-workers の setupFiles。テストファイル毎の(workerd内)D1 にマイグレーションを適用し、
// 本番と同じ drizzle-orm/d1 経路の RdbClient を注入する。isolatedStorage により
// テスト間のストレージは分離される。
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)

setTestD1(env.DB)
setTestRdb(drizzle(env.DB, { schema }))
