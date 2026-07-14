/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    watch: false,
    // クライアントの実挙動は実 Supabase(supa-emu)を要するため web の統合テストで担保する。
    // 本パッケージのユニットテストは Supabase 非依存の純粋ロジックのみを対象とし、カバレッジ閾値は課さない。
    passWithNoTests: true,
  },
})
