import { coverageConfig } from '@trend-diary/config/vitest'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    watch: false,
    coverage: coverageConfig(),
  },
})
