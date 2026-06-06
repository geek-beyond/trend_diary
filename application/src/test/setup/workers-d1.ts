import { applyD1Migrations, env } from 'cloudflare:test'

// テストファイル毎の(workerd内)D1 に migrations を適用する。isolatedStorage により
// テスト間のストレージは分離される。
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS)
