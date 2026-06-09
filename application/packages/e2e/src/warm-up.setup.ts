import { expect, test } from '@playwright/test'

// dev サーバーは初回アクセス時にルートを都度コンパイルする。CI の cold start では
// 記事一覧の初回描画が通常のテストタイムアウトを超えることがあり flaky の原因になる。
// 本テスト群より先にここで一度描画まで踏み、コンパイルを済ませてからテストを走らせる。
test('記事一覧ルートをウォームアップする', async ({ page }) => {
  // 初回コンパイルを待ち切るためのセットアップ専用の猶予
  test.setTimeout(120_000)
  await page.goto('/trends', { waitUntil: 'networkidle', timeout: 120_000 })
  // セットアップ時点では記事が存在しないため、空状態の描画完了をウォームアップ完了とみなす
  await expect(page.getByText('記事がありません')).toBeVisible({ timeout: 120_000 })
})
