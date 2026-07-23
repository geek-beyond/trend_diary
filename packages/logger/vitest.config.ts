import { coverageConfig, testConfig } from '@trend-diary/config/vitest'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: testConfig({
    coverage: coverageConfig(),
  }),
})
