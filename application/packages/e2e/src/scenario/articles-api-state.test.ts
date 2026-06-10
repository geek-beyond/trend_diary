import { test } from '../fixtures'
import * as articleHelper from '../helper/article'
import { Toast } from '../pom/components/toast'
import { TrendsPage } from '../pom/trends-page'

// 一覧API(/api/articles?...)のみを対象とする。`*` は `/` を跨がないため、
// /api/articles/diary や /api/articles/:id/read など配下のパスには影響しない。
const ARTICLES_API_PATTERN = '**/api/articles*'

test.describe('記事一覧APIの状態シナリオ', () => {
  test('API障害時はエラートーストが表示され、記事一覧は空になる', async ({ page }) => {
    await page.route(ARTICLES_API_PATTERN, async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Internal Server Error' }),
      })
    })

    const trendsPage = new TrendsPage(page)
    await trendsPage.goto()

    const toast = new Toast(page)
    await toast.expectText('エラーが発生しました。時間をおいて再度お試しください。')

    await trendsPage.expectNoArticles()
  })

  test.describe('ローディング状態', () => {
    const createdArticleIds: bigint[] = []

    test.beforeAll(async ({ rdb }) => {
      // 途中で作成が失敗しても作成済み分をクリーンアップできるよう、成功の都度登録する
      await Promise.all(
        Array.from({ length: 3 }, async () => {
          const article = await articleHelper.createArticle(rdb)
          createdArticleIds.push(article.articleId)
        }),
      )
    })

    test.afterAll(async ({ rdb }) => {
      await articleHelper.cleanUp(rdb, createdArticleIds)
    })

    test('応答が遅延している間はローディングスピナーが表示され、完了後に記事が並ぶ', async ({
      page,
    }) => {
      // 応答を意図的に遅らせることで、瞬時に消えるローディング表示を観測可能にする
      await page.route(ARTICLES_API_PATTERN, async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        await route.continue()
      })

      const trendsPage = new TrendsPage(page)
      await trendsPage.goto()

      await trendsPage.expectLoadingVisible()

      await trendsPage.expectLoadingHidden()
      await trendsPage.waitForArticleCards()
    })
  })
})
