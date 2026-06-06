import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { createTestMiniflare } from './d1'

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')

// wrangler CLI を subprocess 起動せず、miniflare で在プロセスに migrations を適用する。
// 適用済みは wrangler と同じ d1_migrations テーブルで管理し、再実行でも冪等にする。
export default async function globalSetup(): Promise<void> {
  const migrations = await readD1Migrations(resolve(APP_ROOT, 'migrations'))
  const mf = createTestMiniflare()

  try {
    const db = await mf.getD1Database('DB')
    await db.exec(
      'CREATE TABLE IF NOT EXISTS d1_migrations (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)',
    )
    const applied = await db.prepare('SELECT name FROM d1_migrations').all<{ name: string }>()
    const appliedNames = new Set(applied.results.map((row) => row.name))

    for (const migration of migrations) {
      if (appliedNames.has(migration.name)) continue
      for (const query of migration.queries) {
        await db.prepare(query).run()
      }
      await db.prepare('INSERT INTO d1_migrations (name) VALUES (?)').bind(migration.name).run()
    }
  } finally {
    await mf.dispose()
  }
}
