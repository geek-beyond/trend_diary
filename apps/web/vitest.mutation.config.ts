import { defineConfig } from 'vitest/config'
import { clientProject } from './vitest.client-project.ts'

export default defineConfig({
  test: {
    projects: [clientProject],
  },
})
