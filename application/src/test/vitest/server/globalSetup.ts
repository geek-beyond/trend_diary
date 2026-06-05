import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { disconnectTestRdb } from '@/test/helper/rdb'

// server テストが参照する DATABASE_URL のデフォルト（config.ts の dbUrl と一致させる）。
const DEFAULT_DATABASE_URL = 'file:./test.db'

// scripts/apply-migrations.mjs の絶対パス（このファイルからの相対で解決する）。
const APPLY_MIGRATIONS_SCRIPT = fileURLToPath(
  new URL('../../../../scripts/apply-migrations.mjs', import.meta.url),
)

/**
 * file: 形式の DATABASE_URL に対して migrations を自動適用する。
 * scripts/apply-migrations.mjs を子プロセスで実行して冪等に適用する
 * （適用済みはスキップされるため毎回実行しても安全・高速）。
 * 適用に失敗した場合は例外を投げてテスト全体を止める。
 */
function applyMigrations(): void {
  const databaseUrl = process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL

  // file: 以外（本番 D1 等）はこのスクリプトの対象外なので何もしない。
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
  // file: の DATABASE_URL に migrations を自動適用する（pnpm run test:server を単体で完結させる）。
  applyMigrations()

  // teardown処理を返す
  return async () => {
    disconnectTestRdb()
  }
}
