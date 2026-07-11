import { faker } from '@faker-js/faker'
import { expect, test } from '../fixtures'
import * as articleHelper from '../helper/article'
import * as userHelper from '../helper/user'
import { AuthPage } from '../pom/auth-page'
import { ArticleDrawer } from '../pom/components/article-drawer'
import { AUTH_FLOW_TIMEOUT, SUPPORTED_ARTICLE_URL_PATTERN } from '../pom/constants'
import { InboxPage } from '../pom/inbox-page'
import { TrendsPage } from '../pom/trends-page'

const ARTICLE_COUNT = 10
const MOBILE_VIEWPORT = { width: 375, height: 667 }
const DIGESTION_ARTICLE_COUNT = 3
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

  test.describe('ログインから未読消化までの主要フロー', () => {
    const password = 'Aa1@aaaa'
    const suffix = faker.string.alphanumeric(10).toLowerCase()
    const email = faker.internet.email({
      firstName: 'e2e',
      lastName: `mobile${suffix}`,
      provider: 'example.com',
      allowSpecialCharacters: false,
    })
    const createdArticleIds: bigint[] = []

    test.beforeAll(async ({ rdb }) => {
      await Promise.all(
        Array.from({ length: DIGESTION_ARTICLE_COUNT }, async () => {
          const article = await articleHelper.createArticle(rdb)
          createdArticleIds.push(article.articleId)
        }),
      )
    })

    test.afterAll(async ({ rdb }) => {
      await articleHelper.cleanUp(rdb, createdArticleIds)
      await userHelper.cleanUpByEmailPattern(rdb, email)
    })

    test('ログイン後にトレンド閲覧から未読記事を消化できる', async ({ page }) => {
      // ログインを含む一連のフローのため、認証フローの想定時間を積み増す
      test.setTimeout(AUTH_FLOW_TIMEOUT * 4)

      const authPage = new AuthPage(page)
      await authPage.gotoSignup()
      const signupResult = await authPage.submitSignup(email, password)
      if (signupResult === 'stayed') {
        await authPage.expectSignupConflictError()
        await authPage.gotoLogin()
      }
      await authPage.waitForLoginPage()
      await authPage.submitLogin(email, password)

      // モバイルでは絞り込みがハンバーガーの Sheet 内にあり、デスクトップ用の
      // waitForTrendsPage は使えないため、URL と記事カードの表示で trends 到達を待つ
      await expect(page).toHaveURL(/\/trends(?:\?.*)?$/, { timeout: AUTH_FLOW_TIMEOUT })

      // trends → ドロワー
      const trendsPage = new TrendsPage(page)
      await trendsPage.waitForArticleCards()
      await trendsPage.openFirstArticle()
      const drawer = new ArticleDrawer(page)
      await drawer.waitOpen()
      await drawer.close()
      await drawer.expectClosed()

      // inbox 消化
      const inboxPage = new InboxPage(page)
      await inboxPage.goto()
      await inboxPage.waitForArticleCard()

      // 他テストのデータ混在で総数は一定しないため、消化ごとの相対的な減少で確認する
      const remainingBeforeSkip = await inboxPage.remainingCount()
      expect(remainingBeforeSkip).toBeGreaterThanOrEqual(DIGESTION_ARTICLE_COUNT)

      await inboxPage.skipCurrent()
      await inboxPage.expectRemainingCount(remainingBeforeSkip - 1)
      await inboxPage.waitForArticleCard()

      // 「読む」で実記事を開きつつ消化できることを確認する
      await inboxPage.mockWindowOpen()
      await inboxPage.readCurrent()
      await inboxPage.expectRemainingCount(remainingBeforeSkip - 2)
      const openedUrl = await inboxPage.getLastOpenedUrl()
      expect(openedUrl).toMatch(SUPPORTED_ARTICLE_URL_PATTERN)
    })
  })
})
