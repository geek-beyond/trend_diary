/// <reference types="vitest" />
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cloudflarePool, cloudflareTest, readD1Migrations } from '@cloudflare/vitest-pool-workers'
import { defineConfig } from 'vitest/config'
import { coverageReporter, generateIncludes } from '../generate'

const { testInclude, coverageInclude } = generateIncludes('src/web/server')
const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')

export default defineConfig(async () => {
  // migrations を読み込み、各テスト(workerd内)の D1 へ applyD1Migrations で適用する
  const migrations = await readD1Migrations(resolve(APP_ROOT, 'migrations'))

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
      include: testInclude,
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
        include: coverageInclude,
        exclude: ['src/web/server/handler/factory.ts'],
      },
    },
  }
})
