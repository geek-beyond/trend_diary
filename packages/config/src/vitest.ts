import type { TestUserConfig } from 'vitest/config'

// パッケージ間でカバレッジ方針を統一するための共有プリセット。
// 個別事情（宣言的スキーマや統合テストで担保する箇所の除外など）は引数で上書きする。

// 集約 export 用の index・テスト・テストヘルパは計測対象から外す。
const SHARED_COVERAGE_EXCLUDE = [
  'src/**/index.ts',
  'src/**/*.test.ts',
  'src/test/**',
  'src/test-helper/**',
]

// 全パッケージ共通の最低ライン。回帰を防ぐ floor として全パッケージに付与する。
const COVERAGE_THRESHOLDS = {
  statements: 80,
  branches: 80,
  functions: 80,
  lines: 80,
}

interface CoverageOverrides {
  // workerd は node:inspector 経由のv8カバレッジ計測に非対応のため、provider を上書き可能にする。
  provider?: 'v8' | 'istanbul'
  exclude?: string[]
  thresholds?: Partial<typeof COVERAGE_THRESHOLDS>
}

export function coverageConfig(overrides: CoverageOverrides = {}) {
  const { provider = 'v8', exclude = [], thresholds = {} } = overrides
  return {
    enabled: true,
    provider,
    // json-summary / json は web のカバレッジコメント投稿アクションが参照するため統一して出力する。
    reporter: ['text', 'json-summary', 'json'],
    include: ['src/**/*.ts'],
    exclude: [...SHARED_COVERAGE_EXCLUDE, ...exclude],
    // ベタガキしないと、GitHub Actions に閾値が反映されない。
    thresholds: { ...COVERAGE_THRESHOLDS, ...thresholds },
  }
}

// パッケージ間で重複する test ブロックのボイラープレート共有プリセット。
// pool / setupFiles / coverage など個別事情は overrides で足す。
export function testConfig(overrides: TestUserConfig = {}): TestUserConfig {
  return {
    globals: true,
    include: ['src/**/*.test.ts'],
    watch: false,
    ...overrides,
  }
}
