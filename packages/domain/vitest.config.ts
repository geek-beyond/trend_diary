/// <reference types="vitest" />
import { coverageConfig } from '@trend-diary/vitest-config'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    watch: false,
    coverage: coverageConfig(),
  },
})
