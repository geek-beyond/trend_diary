import storybookTest from '@storybook/addon-vitest/vitest-plugin'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig, loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }
  return {
    plugins: [tailwindcss(), tsconfigPaths(), storybookTest()],
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
      globals: true,
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [
          {
            browser: 'chromium',
          },
        ],
      },
      coverage: {
        include: ['src/web/client/components/**/*.tsx', 'src/web/client/features/**/*.tsx'],
        exclude: ['src/web/client/components/shadcn'],
        thresholds: {
          statements: 84,
          branches: 82,
          functions: 78,
          lines: 85,
        },
      },
    },
  }
})
