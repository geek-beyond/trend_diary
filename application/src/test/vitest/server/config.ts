/// <reference types="vitest" />
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { TEST_DATABASE_URL } from '../../env'
import { coverageReporter, generateIncludes } from '../generate'

const { testInclude, coverageInclude } = generateIncludes('src/web/server')

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    globalSetup: ['src/test/setup/apply-migrations.ts'],
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
    },
    // テスト間の影響が無いようにする
    // 参考: https://zenn.dev/microcms/articles/c3b9d48b5647b4#%E8%A8%AD%E5%AE%9A%E6%96%B9%E6%B3%95
    pool: 'threads',
    maxWorkers: 1,
    include: testInclude,
    coverage: {
      reporter: coverageReporter,
      // ベタガキしないと、Github Actionsに閾値が反映されない
      thresholds: {
        statements: 60, // 命令網羅, ソースコードの全ての命令が実行されるかどうか
        branches: 80, // 分岐網羅, 処理のパスの通過率とほぼ同義
        functions: 60, // 関数網羅, 関数の実行パスの通過率
        lines: 60, // 行網羅, ソースコードの全ての行が実行されるかどうか
      },
      include: coverageInclude,
      exclude: ['src/web/server/handler/factory.ts'],
    },
  },
})
