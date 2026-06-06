import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  globalSetup: './global-setup.ts',
  testDir: '.',
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
    command: 'pnpm start',
    // command は application ルート基準で実行する（cwd 既定は config ファイルの場所）
    cwd: '../../..',
    url: 'http://localhost:5173',
    env: {
      // dev サーバーのファイル監視用
      CHOKIDAR_USEPOLLING: '1',
    },
    reuseExistingServer: false,
  },
})
