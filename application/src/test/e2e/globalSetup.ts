import { TEST_DATABASE_URL } from '@/test/env'
import { applyMigrations } from '@/test/setup/apply-migrations'

// webServer の readiness（HTTP）は DB に依存しないため、テストの最初のクエリ前に
// globalSetup で migrations 適用を完了させればよい。
export default async function globalSetup() {
  await applyMigrations(process.env.DATABASE_URL ?? TEST_DATABASE_URL)
}
