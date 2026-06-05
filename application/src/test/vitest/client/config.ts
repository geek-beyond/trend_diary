/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { coverageReporter } from '../generate'

const testInclude = ['src/web/client/**/*.test.ts']

const coverageInclude = ['src/web/client/**/*.ts']
const exclude = [
  'src/web/client/components/shadcn/**/*',
  'src/web/client/**/*.tsx',
  // React Routerのルート定義はユニットテスト対象外
  'src/web/client/routes.ts',
]

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/vitest/client/setup.ts'],
    include: testInclude,
    exclude,
    // テストファイルがない場合にエラーになるため、テストファイルがない場合でも正常終了とする
    passWithNoTests: true,
    coverage: {
      reporter: coverageReporter,
      include: coverageInclude,
      exclude,
      thresholds: {
        branches: 80, // 分岐網羅
        functions: 60, // 関数網羅
      },
    },
  },
})
