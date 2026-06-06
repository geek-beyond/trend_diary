/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    setupFiles: ['src/test/setup/test-rdb.ts'],
    env: {
      NODE_ENV: 'test',
    },
    include: ['src/cron/**/*.test.ts'],
    pool: 'threads',
    maxWorkers: 1,
    watch: false,
  },
})
