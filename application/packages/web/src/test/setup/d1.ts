import { fileURLToPath } from 'node:url'
import { readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { afterAll } from 'vitest'
import { disposePlatformProxy, platformEnv } from './platform-proxy'

// readD1Migrations は drizzle の statement-breakpoint を解釈するため、トリガー等も正しく分割される。
const migrationsDir = fileURLToPath(new URL('../../../../datastore/migrations', import.meta.url))
const migrations = await readD1Migrations(migrationsDir)

for (const migration of migrations) {
  if (migration.queries.length > 0) {
    await platformEnv.DB.batch(migration.queries.map((query) => platformEnv.DB.prepare(query)))
  }
}

afterAll(async () => {
  await disposePlatformProxy()
})
