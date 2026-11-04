import type { KnipConfig } from 'knip'

// 未使用の export / ファイル / 依存を検出する。pnpm workspace は自動認識され、
// 各 package の package.json の exports/main と各プラグイン（react-router / vite /
// vitest / wrangler 等）が entry を供給するため、ここでは自動検出で漏れる分だけを補う。
const config: KnipConfig = {
  workspaces: {
    // ルート package.json のスクリプトが呼ぶ、依存ではなくグローバル前提の CLI。
    // typecheck は `pnpm -r typecheck`、supabase は Supabase CLI、similarity-ts は
    // CI が prebuilt バイナリで供給する Rust 製 CLI で、いずれも npm 依存ではない。
    '.': {
      ignoreBinaries: ['typecheck', 'supabase', 'similarity-ts'],
    },
    'apps/web': {
      // vite の devServer プラグインが読む dev サーバのエントリ。plugin 設定からは追えないため明示する。
      entry: ['src/dev-server.ts'],
      // ビルド後にのみ生成される react-router のサーバー出力。ビルド前は実体が無く常に未解決になる。
      ignoreUnresolved: ['../build/server'],
      ignore: [
        // shadcn/ui 由来のプリミティブは一式を意図的に保持する UI ライブラリ的資産で、
        // 未使用の component / export を都度消さない。
        'src/client/components/shadcn/**',
        // 静的配信されるアセットは import されず追跡できないため対象外にする。
        'public/**',
      ],
      // React Router が内部で参照する依存はコードから追えないため除外する。
      ignoreDependencies: ['isbot'],
    },
    'apps/cron': {
      // `cloudflare:test` は @cloudflare/vitest-plugin が提供する仮想モジュールで、
      // npm 依存の cloudflare ではない。
      ignoreDependencies: ['cloudflare'],
    },
  },
}

export default config
