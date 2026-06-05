// @ts-expect-error: .mjs テスト基盤モジュール（型定義は持たない）を直接 import する
import { applyMigrations } from '@/test/setup/apply-migrations.mjs'

const DEFAULT_DATABASE_URL = 'file:./test.db'

// webServer の readiness（HTTP）は DB に依存しないため、テストの最初のクエリ前に
// globalSetup で migrations 適用を完了させればよい。
export default async function globalSetup() {
  await applyMigrations(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL)
}
