import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { tsconfigPaths: true },
        test: {
          name: 'client',
          globals: true,
          environment: 'jsdom',
          setupFiles: ['./src/test/setup/client.ts'],
          include: ['src/client/**/*.test.ts'],
          passWithNoTests: true,
        },
      },
    ],
  },
})
