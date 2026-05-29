import storybookTest from '@storybook/addon-vitest/vitest-plugin'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { defineConfig, loadEnv } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// CIでは `.github/workflows/test.yaml` の component ジョブでこの設定を使ってテストを実行する
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }
  return {
    plugins: [tailwindcss(), tsconfigPaths(), storybookTest()],
    // CI(コールドスタート)では vite:dep-scan が依存最適化によるサーバー再起動と競合し、
    // 「The server is being restarted or closed」で起動に失敗する。
    // noDiscovery で起動時の依存スキャン自体を無効化し、stories から辿る依存は
    // include で明示してプリバンドルする(スキャンが走らないので競合しない)。
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
      setupFiles: ['.storybook/vitest.setup.ts'],
      coverage: {
        include: ['src/web/client/components/**/*.tsx', 'src/web/client/features/**/*.tsx'],
        exclude: ['src/web/client/components/shadcn'],
        thresholds: {
          statements: 80,
          branches: 80,
          functions: 80,
          lines: 80,
        },
      },
    },
  }
})
