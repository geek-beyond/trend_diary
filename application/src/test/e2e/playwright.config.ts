import { defineConfig, devices } from '@playwright/test'
import { TEST_DATABASE_URL } from '../env'

// rdb.ts は process.env.DATABASE_URL の有無で libsql クライアントの import を判定するため、
// テストランナープロセス（helper が file: DB に直接アクセスする側）にはテストファイルの
// import より先に評価される config モジュールで供給する必要がある。
process.env.DATABASE_URL ??= TEST_DATABASE_URL

export default defineConfig({
  // webServer と並行して migrations を test.db へ適用する。webServer の readiness(HTTP)は
  // DB 非依存のため、テスト開始前に適用が完了していればよい。
  globalSetup: '../setup/apply-migrations.ts',
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
      DATABASE_URL: TEST_DATABASE_URL,
      // dev サーバーのファイル監視用
      CHOKIDAR_USEPOLLING: '1',
    },
    reuseExistingServer: false,
  },
})
