import { config } from '@trend-diary/config/vitest'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: config({ coverage: false }),
})
