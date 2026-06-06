/// <reference types="vitest" />
import { defineConfig } from 'vite'

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    // テストファイル毎に独立した in-memory SQLite を生成・注入する（テスト間を完全分離）
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
