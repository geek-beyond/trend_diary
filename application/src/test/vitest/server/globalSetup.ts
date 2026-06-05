// @ts-expect-error: .mjs テスト基盤モジュール（型定義は持たない）を直接 import する
import { applyMigrations } from '@/test/setup/apply-migrations.mjs'

// server テストが参照する DATABASE_URL のデフォルト（config.ts の dbUrl と一致させる）。
const DEFAULT_DATABASE_URL = 'file:./test.db'

export default async function globalSetup() {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL

  if (databaseUrl.startsWith('file:')) {
    await applyMigrations(databaseUrl)
  }
}
