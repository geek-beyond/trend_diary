/// <reference types="vitest" />
import { defineConfig } from 'vite'
import { coverageReporter } from '../generate'

const testInclude = ['src/client/**/*.test.ts']

const coverageInclude = ['src/client/**/*.ts']
const exclude = [
  'src/client/components/shadcn/**/*',
  'src/client/**/*.tsx',
  // React Routerのルート定義はユニットテスト対象外
  'src/client/routes.ts',
]

export default defineConfig({
  // __IS_DEV__ は本来 vite.config のプラグインがビルド時に注入するが、
  // この vitest 設定は vite.config を読み込まないため明示的に定義する。
  define: {
    // biome-ignore lint/style/useNamingConvention: build-time injected global
    __IS_DEV__: 'false',
  },
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
