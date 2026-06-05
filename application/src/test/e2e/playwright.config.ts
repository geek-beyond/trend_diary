import { defineConfig, devices } from '@playwright/test'

// E2E 用の file: SQLite DB。globalSetup の migrations 適用先と webServer の参照先を一致させる。
const DATABASE_URL = 'file:./test.db'

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// import dotenv from 'dotenv';
// import path from 'path';
// dotenv.config({ path: path.resolve(__dirname, '.env') });

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  // webServer 起動と並行して migrations を test.db へ適用する。
  // webServer の readiness（HTTP）は DB 非依存のため、テストの最初のクエリ前に適用が完了すればよい。
  globalSetup: './globalSetup.ts',
  testDir: '.',
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  // INFO: CIに合わせる
  forbidOnly: true,
  /* Retry on CI only */
  // INFO: CIに合わせる
  retries: 2,
  /* Run tests in files in parallel */
  // INFO: CIではスペックの問題で並列実行ができないので、オフにする
  fullyParallel: false,
  /* Opt out of parallel tests on CI. */
  // INFO: CIではスペックの問題で並列実行ができないので、オフにする
  workers: 1,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { outputFolder: 'playwright-report' }]],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:5173',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    /* Test against mobile viewports. */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'pnpm start',
    // INFO: command は application ルート基準で実行する（config の cwd 既定は config ファイルの場所）。
    cwd: '../../..',
    url: 'http://localhost:5173',
    // INFO: 既存の process.env に上書きマージされる。CHOKIDAR_USEPOLLING は dev サーバーのファイル監視用。
    env: {
      DATABASE_URL,
      CHOKIDAR_USEPOLLING: '1',
    },
    // INFO: CIに合わせる
    reuseExistingServer: false,
  },
})
