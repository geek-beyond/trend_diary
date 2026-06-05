/// <reference types="vitest" />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// server テストの test.db と衝突しないよう cron 専用ファイルを使う。
const dbUrl = 'file:./test-cron.db'

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    globalSetup: ['src/test/vitest/cron/globalSetup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: dbUrl,
    },
    include: ['src/cron/**/*.test.ts'],
    pool: 'threads',
    maxWorkers: 1,
    watch: false,
  },
})
