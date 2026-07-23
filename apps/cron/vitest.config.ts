/// <reference types="vitest" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflarePool, cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { coverageConfig } from '@trend-diary/vitest-config'
import { defineConfig } from 'vitest/config'

// migrations は datastore パッケージで集中管理しているため、パッケージから参照する。
const MIGRATIONS_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'packages',
  'datastore',
  'migrations',
)

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
      coverage: coverageConfig({ provider: 'istanbul' }),
    },
  }
})
