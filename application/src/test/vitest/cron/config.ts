/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { TEST_DATABASE_URL } from '../../env'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    globalSetup: ['src/test/setup/apply-migrations.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
    },
    include: ['src/cron/**/*.test.ts'],
    pool: 'threads',
    maxWorkers: 1,
    watch: false,
  },
})
