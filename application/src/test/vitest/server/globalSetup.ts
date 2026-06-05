import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { disconnectTestRdb } from '@/test/helper/rdb'

// server テストが参照する DATABASE_URL のデフォルト（config.ts の dbUrl と一致させる）。
const DEFAULT_DATABASE_URL = 'file:./test.db'

const APPLY_MIGRATIONS_SCRIPT = fileURLToPath(
  new URL('../../../../scripts/apply-migrations.mjs', import.meta.url),
)

function applyMigrations(): void {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL

  if (!databaseUrl.startsWith('file:')) {
    return
  }

  const result = spawnSync(process.execPath, [APPLY_MIGRATIONS_SCRIPT], {
    cwd: resolve(fileURLToPath(new URL('../../../../', import.meta.url))),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  })

  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    throw new Error(
      `マイグレーションの自動適用に失敗しました（終了コード: ${result.status}）。` +
        `DATABASE_URL=${databaseUrl}`,
    )
  }
}

export default async function globalSetup() {
  applyMigrations()

  return async () => {
    disconnectTestRdb()
  }
}
