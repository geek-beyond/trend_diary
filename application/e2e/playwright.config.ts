import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  // dev サーバ起動前に miniflare local D1(.wrangler/state)へ migrations を適用する
  globalSetup: './src/global-setup.ts',
  testDir: './src',
  forbidOnly: true,
  retries: 2,
  // CIのスペックの問題で並列実行ができないため、ローカルもCIに合わせてオフにする
  fullyParallel: false,
  workers: 1,
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // dev サーバ(pnpm dev)はルートを初回アクセス時に都度コンパイルするため cold start が不安定。
    // ビルド済みワーカーを wrangler dev で配信し、オンデマンドコンパイル由来の flaky を避ける。
    command: 'pnpm build && pnpm exec wrangler dev --port 5173',
    // command は web パッケージ(apps/web)ルート基準で実行する（cwd 既定は config ファイルの場所）
    cwd: '../apps/web',
    url: 'http://localhost:5173',
    // build を含むため既定(60s)では足りない
    timeout: 180_000,
    reuseExistingServer: false,
  },
})
