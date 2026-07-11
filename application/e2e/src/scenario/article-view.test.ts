import { expect, test } from '../fixtures'
import * as articleHelper from '../helper/article'
import { ArticleDrawer } from '../pom/components/article-drawer'
import { SUPPORTED_ARTICLE_URL_PATTERN } from '../pom/constants'
import { TrendsPage } from '../pom/trends-page'

const ARTICLE_COUNT = 10
// 同一シナリオをデバイス別に検証するため、デスクトップ(Desktop Chrome 既定)とモバイルを表で並べる
const VIEWPORTS = {
  デスクトップ: { width: 1280, height: 720 },
  モバイル: { width: 375, height: 667 },
}

test.describe('記事閲覧シナリオ', () => {
  const createdArticleIds: bigint[] = []

  test.beforeAll(async ({ rdb }) => {
    // 途中で作成が失敗しても作成済み分をクリーンアップできるよう、成功の都度登録する
    await Promise.all(
      Array.from({ length: ARTICLE_COUNT }, async () => {
        const article = await articleHelper.createArticle(rdb)
        createdArticleIds.push(article.articleId)
      }),
    )
  })

  test.afterAll(async ({ rdb }) => {
    await articleHelper.cleanUp(rdb, createdArticleIds)
  })

  for (const [device, viewport] of Object.entries(VIEWPORTS)) {
    test.describe(device, () => {
      test.use({ viewport })

      test.beforeEach(async ({ page }) => {
        const trendsPage = new TrendsPage(page)
        await trendsPage.goto()
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
  }
})
