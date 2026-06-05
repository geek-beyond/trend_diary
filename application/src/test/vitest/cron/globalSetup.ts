import { TEST_DATABASE_URL } from '@/test/env'
// @ts-expect-error: .mjs テスト基盤モジュール（型定義は持たない）を直接 import する
import { applyMigrations } from '@/test/setup/apply-migrations.mjs'

export default async function globalSetup() {
  await applyMigrations(process.env.DATABASE_URL ?? TEST_DATABASE_URL)
}
