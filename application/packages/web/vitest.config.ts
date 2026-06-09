import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflarePool, cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import storybookTest from '@storybook/addon-vitest/vitest-plugin'
import tailwindcss from '@tailwindcss/vite'
import { playwright } from '@vitest/browser-playwright'
import { loadEnv } from 'vite'
import { defineConfig, type UserConfig } from 'vitest/config'

// client/server/storybook はカバレッジの provider・閾値・実行環境がそれぞれ異なり、
// 1回の coverage run に統合できない(server は Workers Pool のため istanbul 必須、
// client/storybook は v8 系)。そのため projects ではなく --mode で設定を出し分け、
// 3つの独立した vitest run として実行する。
//   pnpm test:client    -> --mode client
//   pnpm test:server    -> --mode server
//   pnpm test-storybook -> --mode storybook
// Storybook ビルダー(dev/build)が viteConfigPath 経由で読み込む場合は
// mode が development/production になるため、default で storybook 設定を返す。

const coverageReporter = ['text', 'json-summary', 'json']

// このファイルが置かれているディレクトリ(= packages/web のルート)。
// monorepo でカレントディレクトリが異なっても安定して参照できるよう process.cwd() ではなくこれを基準にする。
const PACKAGE_ROOT = dirname(fileURLToPath(import.meta.url))

// --- client ---------------------------------------------------------------

function clientConfig(): UserConfig {
  const exclude = [
    'src/client/components/shadcn/**/*',
    'src/client/**/*.tsx',
    // React Routerのルート定義はユニットテスト対象外
    'src/client/routes.ts',
  ]

  return {
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/vitest/client/setup.ts'],
      include: ['src/client/**/*.test.ts'],
      exclude,
      // テストファイルがない場合にエラーになるため、テストファイルがない場合でも正常終了とする
      passWithNoTests: true,
      coverage: {
        reporter: coverageReporter,
        include: ['src/client/**/*.ts'],
        exclude,
        thresholds: {
          branches: 80, // 分岐網羅
          functions: 60, // 関数網羅
        },
      },
    },
  }
}

// --- server ---------------------------------------------------------------

// migrations は datastore パッケージで一元管理しているため、パッケージ(packages/web)から相対参照する。
const MIGRATIONS_DIR = resolve(PACKAGE_ROOT, '..', 'datastore', 'migrations')

async function serverConfig(): Promise<UserConfig> {
  const migrations = await readD1Migrations(MIGRATIONS_DIR)

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

  return {
    plugins: [cloudflareTest(poolOptions)],
    resolve: {
      tsconfigPaths: true,
    },
    test: {
      globals: true,
      pool: cloudflarePool(poolOptions),
      setupFiles: ['src/test/setup/workers-d1.ts'],
      include: ['src/server/**/*.test.ts'],
      coverage: {
        provider: 'istanbul' as const,
        reporter: coverageReporter,
        // ベタガキしないと、Github Actionsに閾値が反映されない
        thresholds: {
          statements: 60, // 命令網羅, ソースコードの全ての命令が実行されるかどうか
          branches: 80, // 分岐網羅, 処理のパスの通過率とほぼ同義
          functions: 60, // 関数網羅, 関数の実行パスの通過率
          lines: 60, // 行網羅, ソースコードの全ての行が実行されるかどうか
        },
        include: ['src/server/**/*'],
        exclude: ['src/server/handler/factory.ts'],
      },
    },
  }
}

// --- storybook ------------------------------------------------------------

function storybookConfig(mode: string): UserConfig {
  const env = loadEnv(mode, PACKAGE_ROOT, '')
  process.env = { ...process.env, ...env }

  return {
    resolve: {
      tsconfigPaths: true,
    },
    plugins: [tailwindcss(), storybookTest()],
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
        include: ['src/client/components/**/*.tsx', 'src/client/features/**/*.tsx'],
        exclude: [
          'src/client/components/shadcn',
          // 分岐や振る舞いを持たない純粋なラッパーは結合検証の対象が無いためStory・カバレッジ対象外とする
          'src/client/components/ui/legal',
          'src/client/components/ui/link.tsx',
          'src/client/components/customized/spinner',
          'src/client/features/diary/diary-login-required.tsx',
        ],
        thresholds: {
          statements: 75,
          branches: 75,
          functions: 75,
          lines: 75,
        },
      },
    },
  }
}

export default defineConfig(async ({ mode }) => {
  switch (mode) {
    // 引数なしの bare `vitest`(mode='test')はブラウザを起動しない軽量な client を既定にする
    case 'test':
    case 'client':
      return clientConfig()
    case 'server':
      return await serverConfig()
    default:
      // --mode storybook、および Storybook ビルダー(viteConfigPath 経由, mode=development/production)で利用
      return storybookConfig(mode)
  }
})
