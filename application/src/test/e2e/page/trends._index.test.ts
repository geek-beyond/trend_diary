import { expect, test } from '@playwright/test'
import { addJstDays, toJstDateString } from '@/common/locale/date'
import { ArticleDrawer } from '@/test/e2e/pom/components/article-drawer'
import { DesktopMediaFilter } from '@/test/e2e/pom/components/desktop-media-filter'
import { SUPPORTED_ARTICLE_URL_PATTERN } from '@/test/e2e/pom/constants'
import { TrendsPage } from '@/test/e2e/pom/trends-page'
import * as articleHelper from '@/test/helper/article'
import { disposeE2ETestRdb, initE2ETestRdb } from '@/test/setup/e2e-rdb'

// dev サーバと同じ miniflare local D1 へ接続し、本番ハンドラが読む DB へシードする
test.beforeAll(initE2ETestRdb)
test.afterAll(disposeE2ETestRdb)

const ARTICLE_COUNT = 10

function getTodayJstNoon(daysOffset = 0): Date {
  const todayResult = toJstDateString(new Date())
  const today = todayResult.isErr() ? '1970-01-01' : todayResult.value
  const dateResult = addJstDays(today, daysOffset)
  const dateString = dateResult.isErr() ? today : dateResult.value
  return new Date(`${dateString}T12:00:00+09:00`)
}

test.describe('記事一覧ページ', () => {
  test.beforeEach(async ({ page }) => {
    const trendsPage = new TrendsPage(page)
    await trendsPage.goto()
  })

  test.describe('記事がない場合', () => {
    test('記事がないと表示される', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.expectNoArticlesMessage()
    })
  })

  test.describe('記事がある場合', () => {
    const createdArticleIds: bigint[] = []

    test.beforeAll(async () => {
      // 記事を作成
      const articles = await Promise.all(
        Array.from({ length: ARTICLE_COUNT }, () => articleHelper.createArticle()),
      )
      createdArticleIds.push(...articles.map((a) => a.articleId))
    })

    test.afterAll(async () => {
      // テスト後に記事をクリーンアップ
      await articleHelper.cleanUp(createdArticleIds)
    })

    test.beforeEach(async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForArticleCards()
    })

    test('記事一覧から記事詳細を閲覧し、再び記事一覧に戻る', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      const articleCard = trendsPage.firstArticleCard()
      await expect(articleCard).toBeVisible()

      await trendsPage.openFirstArticle()

      const drawer = new ArticleDrawer(page)
      await drawer.waitOpen()
      await drawer.close()
      await drawer.expectClosed()

      // 記事一覧に戻っていることを確認(記事カードが表示されていること)
      await expect(articleCard).toBeVisible()
    })

    test('記事一覧から記事詳細を閲覧し、その実際の記事を閲覧する', async ({ page }) => {
      const drawer = new ArticleDrawer(page)
      await drawer.mockWindowOpen()

      const trendsPage = new TrendsPage(page)
      await trendsPage.openFirstArticle()
      await drawer.waitOpen()
      await drawer.clickReadArticle()
      const openedUrl = await drawer.getLastOpenedUrl()

      // 記事URLが開かれることを確認
      expect(openedUrl).toMatch(SUPPORTED_ARTICLE_URL_PATTERN)
    })
  })

  test.describe('メディアフィルター機能', () => {
    const QIITA_COUNT = 5
    const ZENN_COUNT = 3
    const createdArticleIds: bigint[] = []

    test.beforeAll(async () => {
      // Qiita記事を作成
      const qiitaArticles = await Promise.all(
        Array.from({ length: QIITA_COUNT }, () => articleHelper.createArticle({ media: 'qiita' })),
      )
      createdArticleIds.push(...qiitaArticles.map((a) => a.articleId))

      // Zenn記事を作成
      const zennArticles = await Promise.all(
        Array.from({ length: ZENN_COUNT }, () => articleHelper.createArticle({ media: 'zenn' })),
      )
      createdArticleIds.push(...zennArticles.map((a) => a.articleId))
    })

    test.afterAll(async () => {
      await articleHelper.cleanUp(createdArticleIds)
    })

    test.beforeEach(async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForArticleCards()
    })

    test('メディアフィルターが表示される', async ({ page }) => {
      const mediaFilter = new DesktopMediaFilter(page)
      await mediaFilter.expectVisible()
    })

    test('初期状態では全ての記事が表示される', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.expectArticleCount(QIITA_COUNT + ZENN_COUNT)
    })

    test('Qiitaを選択すると即時反映でQiita記事のみが表示される', async ({ page }) => {
      const mediaFilter = new DesktopMediaFilter(page)
      await mediaFilter.select('qiita')

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends\?media=qiita$/)
      await trendsPage.expectArticleCount(QIITA_COUNT)
      await trendsPage.expectQiitaIconCount(QIITA_COUNT)
    })

    test('Zennを選択すると即時反映でZenn記事のみが表示される', async ({ page }) => {
      const mediaFilter = new DesktopMediaFilter(page)
      await mediaFilter.select('zenn')

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends\?media=zenn$/)
      await trendsPage.expectArticleCount(ZENN_COUNT)
      await trendsPage.expectZennIconCount(ZENN_COUNT)
    })

    test('すべてを選択すると即時反映で全記事が表示される', async ({ page }) => {
      const mediaFilter = new DesktopMediaFilter(page)
      await mediaFilter.select('qiita')

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends\?media=qiita$/)
      await trendsPage.expectArticleCount(QIITA_COUNT)

      await mediaFilter.select('all')
      await trendsPage.waitForUrl(/\/trends$/)
      await trendsPage.expectArticleCount(QIITA_COUNT + ZENN_COUNT)
    })

    test('媒体選択時にページがリセットされる', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.goto('/trends?page=2')
      await page.waitForLoadState('networkidle')

      const mediaFilter = new DesktopMediaFilter(page)
      await mediaFilter.select('qiita')
      await trendsPage.waitForUrl(/\/trends\?media=qiita$/)
      trendsPage.expectQueryParamNull('page')
    })

    test('すべて選択時にページがリセットされる', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.goto('/trends?media=qiita&page=2')
      await page.waitForLoadState('networkidle')

      const mediaFilter = new DesktopMediaFilter(page)
      await mediaFilter.select('all')
      await trendsPage.waitForUrl(/\/trends$/)
      trendsPage.expectQueryParamNull('page')
      trendsPage.expectQueryParamNull('media')
    })
  })

  test.describe('日付フィルター機能', () => {
    const createdArticleIds: bigint[] = []

    test.beforeAll(async () => {
      const todayArticle = await articleHelper.createArticle({
        media: 'qiita',
        title: '日付フィルタ_当日',
        createdAt: getTodayJstNoon(0),
      })
      const withinWeekArticle = await articleHelper.createArticle({
        media: 'zenn',
        title: '日付フィルタ_5日前',
        createdAt: getTodayJstNoon(-5),
      })
      const outOfWeekArticle = await articleHelper.createArticle({
        media: 'hatena',
        title: '日付フィルタ_8日前',
        createdAt: getTodayJstNoon(-8),
      })
      createdArticleIds.push(
        todayArticle.articleId,
        withinWeekArticle.articleId,
        outOfWeekArticle.articleId,
      )
    })

    test.afterAll(async () => {
      await articleHelper.cleanUp(createdArticleIds)
    })

    test.beforeEach(async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForArticleCards()
    })

    test('初期状態では当日記事のみ表示される', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.expectArticleCount(1)
      await trendsPage.expectQiitaIconCount(1)
      await trendsPage.expectZennIconCount(0)
      await trendsPage.expectHatenaIconCount(0)
      await trendsPage.waitForUrl(/\/trends$/)
    })

    test('7日を選択すると直近7日まで表示される', async ({ page }) => {
      await page.locator("[data-slot='date-preset-filter-last7days']").click()

      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForUrl(/\/trends\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/)
      await trendsPage.expectArticleCount(2)
      await trendsPage.expectQiitaIconCount(1)
      await trendsPage.expectZennIconCount(1)
      await trendsPage.expectHatenaIconCount(0)
      trendsPage.expectQueryParamPresent('from')
      trendsPage.expectQueryParamPresent('to')
    })
  })
})
