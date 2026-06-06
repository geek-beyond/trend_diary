/// <reference types="vitest" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflarePool, cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

export default defineConfig(async () => {
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

  return {
    plugins: [cloudflareTest(poolOptions)],
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      globals: true,
      pool: cloudflarePool(poolOptions),
      setupFiles: ['src/test/setup/workers-d1.ts'],
      include: ['src/cron/**/*.test.ts'],
      watch: false,
    },
  }
})
