import type { TestProjectConfiguration } from 'vitest/config'

export const clientProject: TestProjectConfiguration = {
  resolve: { tsconfigPaths: true },
  test: {
    name: 'client',
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup/client.ts'],
    include: ['src/client/**/*.test.ts'],
    passWithNoTests: true,
  },
}
