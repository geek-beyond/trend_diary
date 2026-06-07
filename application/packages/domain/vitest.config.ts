/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    watch: false,
    coverage: {
      enabled: true,
      reporter: ['text', 'json-summary', 'json'],
      // ベタガキしないと、GitHub Actionsに閾値が反映されない
      thresholds: {
        statements: 60, // 命令網羅, ソースコードの全ての命令が実行されるかどうか
        branches: 80, // 分岐網羅, 処理のパスの通過率とほぼ同義
        functions: 60, // 関数網羅, 関数の実行パスの通過率
        lines: 60, // 行網羅, ソースコードの全ての行が実行されるかどうか
      },
      include: ['src/**/*.ts'],
      // 集約export用のindex・テスト・テストヘルパを除外
      exclude: ['src/**/index.ts', 'src/**/*.test.ts', 'src/test-helper/**'],
    },
  },
})
