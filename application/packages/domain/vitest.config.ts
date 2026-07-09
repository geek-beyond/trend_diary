/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { coverageConfig } from '../../vitest.coverage'

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.test.ts'],
    watch: false,
    coverage: coverageConfig(),
  },
})
