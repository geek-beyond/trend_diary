import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import storybookTest from '@storybook/addon-vitest/vitest-plugin'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig } from 'vitest/config'

const rootDir = dirname(fileURLToPath(import.meta.url))

export default defineConfig(() => {
  return {
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
        {
          resolve: { tsconfigPaths: true },
          test: {
            name: 'server',
            globals: true,
            environment: 'node',
            setupFiles: ['src/test/setup/d1.ts'],
            include: ['src/server/**/*.test.ts', 'src/middleware/**/*.test.ts'],
          },
        },
        {
          plugins: [tailwindcss(), storybookTest({ configDir: resolve(rootDir, '.storybook') })],
          resolve: { tsconfigPaths: true },
          optimizeDeps: {
            noDiscovery: true,
            include: [
              'react',
              'react-dom',
              'react-dom/client',
              'react/jsx-runtime',
              'react/jsx-dev-runtime',
              'react-router',
              '@radix-ui/react-dialog',
              '@radix-ui/react-label',
              '@radix-ui/react-separator',
              '@radix-ui/react-slot',
              '@radix-ui/react-tooltip',
              'class-variance-authority',
              'clsx',
              'tailwind-merge',
              'lucide-react',
              'sonner',
              'vaul',
              'neverthrow',
              'zod',
              'swr/mutation',
              'hono/client',
              'storybook/test',
              'storybook/preview-api',
              '@storybook/react-vite',
              'react-dom/test-utils',
            ],
          },
          test: {
            name: 'storybook',
            globals: true,
            browser: {
              enabled: true,
              headless: true,
              provider: playwright(),
              instances: [{ browser: 'chromium' }],
            },
          },
        },
      ],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json-summary', 'json'],
        all: false,
        exclude: [
          'src/env.ts',
          'src/server.ts',
          'src/worker.ts',
          'src/infrastructure/**',
          // 専用テストを持つ rate-limiter.ts のみ計測対象とし、未テストの他ミドルウェアは除外する
          'src/middleware/context.ts',
          'src/middleware/zod-validator.ts',
          'src/middleware/request-logger.ts',
          'src/middleware/error-handler.ts',
          'src/middleware/authenticator/**',
          'src/test/**',
          'src/client/components/shadcn/**',
          'src/client/routes.ts',
          'src/server/handler-factory.ts',
          'src/client/components/ui/legal',
          'src/client/components/ui/link.tsx',
          'src/client/components/customized/spinner',
          'src/client/features/diary/components/login-required.tsx',
        ],
        // ベタガキしないと、Github Actionsに閾値が反映されない
        thresholds: {
          statements: 75,
          branches: 75,
          functions: 75,
          lines: 75,
        },
      },
    },
  }
})
