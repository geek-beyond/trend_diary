import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup/client.ts'],
    include: ['src/client/**/*.test.ts'],
    passWithNoTests: true,
  },
})
