import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: 'node',
    // 同じ変異のテストだけを2並列で実行し、認証データの競合と過剰なWorkers起動を避ける。
    maxWorkers: 2,
    testTimeout: 15_000,
    hookTimeout: 30_000,
    setupFiles: ['src/test/setup/d1.ts'],
    include: [
      'src/server.test.ts',
      'src/server/**/*.test.ts',
      'src/middleware/**/*.test.ts',
      'src/common/**/*.test.ts',
    ],
  },
})
