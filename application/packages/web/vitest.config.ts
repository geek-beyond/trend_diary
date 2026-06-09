import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflarePool, cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import storybookTest from '@storybook/addon-vitest/vitest-plugin'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { loadEnv } from 'vite'
import { defineConfig } from 'vitest/config'

// 実行は projects 単位(`vitest --project <name>`)。
// server は Workers Pool のため coverage provider は istanbul に統一する(provider はルートに1つのみ)。
export default defineConfig(async () => {
  // migrations は datastore パッケージで一元管理しているため相対参照する
  const migrations = await readD1Migrations(
    resolve(dirname(fileURLToPath(import.meta.url)), '..', 'datastore', 'migrations'),
  )
  const poolOptions = {
    miniflare: {
      compatibilityDate: '2025-04-01',
      compatibilityFlags: ['nodejs_compat'],
      d1Databases: { DB: 'test-db' },
      bindings: {
        TEST_MIGRATIONS: migrations,
        NODE_ENV: 'test',
        LOG_LEVEL: 'silent',
      },
    },
  }

  // story が参照する .env を process.env へ展開する
  process.env = { ...process.env, ...loadEnv('test', process.cwd(), '') }

  return {
    test: {
      projects: [
        {
          resolve: { tsconfigPaths: true },
          test: {
            name: 'client',
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./src/test/vitest/client/setup.ts'],
            include: ['src/client/**/*.test.ts'],
            passWithNoTests: true,
          },
        },
        {
          plugins: [cloudflareTest(poolOptions)],
          resolve: { tsconfigPaths: true },
          test: {
            name: 'server',
            globals: true,
            pool: cloudflarePool(poolOptions),
            setupFiles: ['src/test/setup/workers-d1.ts'],
            include: ['src/server/**/*.test.ts'],
          },
        },
        {
          plugins: [tailwindcss(), storybookTest({ configDir: resolve(dirName, '.storybook') })],
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
        provider: 'istanbul',
        reporter: ['text', 'json-summary', 'json'],
        // project 単位で実行するため、読み込まれたファイルのみ集計する(all:false)
        all: false,
        exclude: [
          // client/server 横断の共有プラグイン・インフラはカバレッジ対象外
          'src/env.ts',
          'src/server.ts',
          'src/worker.ts',
          'src/infrastructure/**',
          'src/middleware/**',
          'src/test/**',
          'src/client/components/shadcn/**',
          'src/client/routes.ts',
          'src/server/handler/factory.ts',
          // 分岐や振る舞いを持たない純粋なラッパーは対象外
          'src/client/components/ui/legal',
          'src/client/components/ui/link.tsx',
          'src/client/components/customized/spinner',
          'src/client/features/diary/diary-login-required.tsx',
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
