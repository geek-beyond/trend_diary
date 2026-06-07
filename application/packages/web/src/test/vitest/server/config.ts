/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { coverageReporter, generateIncludes } from '../generate'
import { createWorkersPool } from '../workers-pool'

const { testInclude, coverageInclude } = generateIncludes('src/server')

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
      include: testInclude,
      coverage: {
        provider: 'istanbul' as const,
        reporter: coverageReporter,
        // ベタガキしないと、Github Actionsに閾値が反映されない
        thresholds: {
          statements: 60, // 命令網羅, ソースコードの全ての命令が実行されるかどうか
          branches: 80, // 分岐網羅, 処理のパスの通過率とほぼ同義
          functions: 60, // 関数網羅, 関数の実行パスの通過率
          lines: 60, // 行網羅, ソースコードの全ての行が実行されるかどうか
        },
        include: coverageInclude,
        exclude: ['src/server/handler/factory.ts'],
      },
    },
  }
})
