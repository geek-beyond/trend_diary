/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { createWorkersPool } from '../workers-pool'

export default defineConfig(async () => {
  const { plugins, pool } = await createWorkersPool()

  return {
    plugins,
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      globals: true,
      pool,
      setupFiles: ['src/test/setup/workers-d1.ts'],
      include: ['src/cron/**/*.test.ts'],
      watch: false,
    },
  }
})
