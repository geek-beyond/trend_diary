import { expect, test } from '../fixtures'
import * as articleHelper from '../helper/article'
import { ArticleDrawer } from '../pom/components/article-drawer'
import { SUPPORTED_ARTICLE_URL_PATTERN } from '../pom/constants'
import { TrendsPage } from '../pom/trends-page'

const ARTICLE_COUNT = 10
const MOBILE_VIEWPORT = { width: 375, height: 667 }
const LONG_ARTICLE_TITLE = '概要トグル確認用記事'
const LONG_ARTICLE_DESCRIPTION =
  'TrendDiaryは技術トレンドの収集と閲覧を効率化するためのサービスであり、記事の要点を短時間で把握しながら必要に応じて元記事へ素早くアクセスできる。モバイル表示時の概要折りたたみ挙動を確認するため、この説明文は十分に長くしている。'

test.describe('記事閲覧シナリオ(モバイル)', () => {
  test.use({ viewport: MOBILE_VIEWPORT })

  test.describe('記事詳細の閲覧', () => {
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

  test.describe('記事詳細の概要表示', () => {
    const createdArticleIds: bigint[] = []

    test.beforeAll(async ({ rdb }) => {
      const article = await articleHelper.createArticle(rdb, {
        title: LONG_ARTICLE_TITLE,
        description: LONG_ARTICLE_DESCRIPTION,
      })
      createdArticleIds.push(article.articleId)
    })

    test.afterAll(async ({ rdb }) => {
      await articleHelper.cleanUp(rdb, createdArticleIds)
    })

    test.beforeEach(async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.goto()
      await trendsPage.waitForArticleCards()
    })

    test('長い概要は初期折りたたみで表示され、続きを読むで展開できること', async ({ page }) => {
      const trendsPage = new TrendsPage(page)
      await trendsPage.openArticleByTitle(LONG_ARTICLE_TITLE)

      const drawer = new ArticleDrawer(page)
      await drawer.waitOpen()
      await drawer.expectDescriptionCollapsed()
      await drawer.expectDescriptionToggle('続きを読む')

      await drawer.clickDescriptionToggle('続きを読む')
      await drawer.expectDescriptionExpanded()
      await drawer.expectDescriptionToggle('閉じる')
      await drawer.expectReadArticleButtonVisible()
    })
  })
})
