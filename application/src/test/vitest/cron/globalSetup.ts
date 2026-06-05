// @ts-expect-error: .mjs テスト基盤モジュール（型定義は持たない）を直接 import する
import { applyMigrations } from '@/test/setup/apply-migrations.mjs'

// server テストの test.db と衝突しないよう専用ファイルを使う。
const DEFAULT_DATABASE_URL = 'file:./test-cron.db'

export default async function globalSetup() {
  await applyMigrations(process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL)
}
