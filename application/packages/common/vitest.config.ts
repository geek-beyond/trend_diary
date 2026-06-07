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
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
      include: ['src/**/*.ts'],
      // 集約export用のindex・テスト・テストヘルパを除外
      exclude: ['src/**/index.ts', 'src/**/*.test.ts', 'src/test-helper/**'],
    },
  },
})
