import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflarePool, cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import type { Plugin } from 'vite'

// migrations は application ルートで一元管理しているため、パッケージ(packages/web)から相対参照する。
const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..')

export async function createWorkersPool(): Promise<{
  plugins: Plugin[]
  pool: ReturnType<typeof cloudflarePool>
}> {
  const migrations = await readD1Migrations(resolve(APP_ROOT, 'migrations'))

  const poolOptions = {
    miniflare: {
      compatibilityDate: '2025-04-01',
      compatibilityFlags: ['nodejs_compat'],
      d1Databases: { DB: 'test-db' },
      bindings: {
        TEST_MIGRATIONS: migrations,
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
      },
    },
  }

  return { plugins: [cloudflareTest(poolOptions)], pool: cloudflarePool(poolOptions) }
}
