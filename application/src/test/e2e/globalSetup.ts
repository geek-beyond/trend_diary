// @ts-expect-error: .mjs テスト基盤モジュール（型定義は持たない）を直接 import する
import { applyMigrations } from '@/test/setup/apply-migrations.mjs'

// E2E が参照する DATABASE_URL のデフォルト（playwright.config.ts の webServer env と一致させる）。
const DEFAULT_DATABASE_URL = 'file:./test.db'

// webServer の readiness（HTTP）は DB に依存しないため、migrations 適用は
// globalSetup で完了させればよい（テストの最初のクエリ前に適用が終わる）。
export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL

  if (databaseUrl.startsWith('file:')) {
    await applyMigrations(databaseUrl)
  }
}
