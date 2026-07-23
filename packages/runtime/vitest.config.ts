import { baseTestConfig, coverageConfig } from '@trend-diary/config/vitest'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: baseTestConfig({
    coverage: coverageConfig(),
  }),
})
