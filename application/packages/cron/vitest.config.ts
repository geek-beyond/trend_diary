/// <reference types="vitest" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflarePool, cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url))
// migrations は datastore パッケージで集中管理しているため、パッケージから参照する。
const MIGRATIONS_DIR = resolve(PACKAGE_ROOT, '..', 'datastore', 'migrations')

export default defineConfig(async () => {
  const migrations = await readD1Migrations(MIGRATIONS_DIR)

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

  return {
    plugins: [cloudflareTest(poolOptions)],
    test: {
      globals: true,
      pool: cloudflarePool(poolOptions),
      setupFiles: ['src/test-helper/setup-d1.ts'],
      include: ['src/**/*.test.ts'],
      watch: false,
    },
  }
})
