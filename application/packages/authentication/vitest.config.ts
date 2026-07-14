/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { coverageConfig } from '../../vitest.coverage'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    watch: false,
    // supabase-client は SDK 生成のみの薄いラッパで、実 Supabase を要する web 統合テストで担保する
    coverage: coverageConfig({ exclude: ['src/supabase-client.ts'] }),
  },
})
