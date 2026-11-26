import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: 'node',
    // D1と認証エミュレータを使うため、変異セッション内のファイル並列実行を抑える。
    fileParallelism: false,
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
