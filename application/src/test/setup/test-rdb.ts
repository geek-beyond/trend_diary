import { createClient } from '@libsql/client'
import { drizzle as drizzleLibsql } from 'drizzle-orm/libsql'
import * as schema from '@/infrastructure/drizzle-orm/schema'
import { setTestRdb } from '@/test/helper/rdb'
import { applyMigrationsToClient } from '@/test/setup/apply-migrations'

// vitest の setupFiles として各テストファイルで実行され、テストファイル毎に独立した
// in-memory SQLite を生成・マイグレーション適用して注入する（テスト間を完全分離、後始末不要）。
process.env.NODE_ENV = 'test'

const client = createClient({ url: ':memory:' })
await applyMigrationsToClient(client)
setTestRdb(drizzleLibsql(client, { schema }))
