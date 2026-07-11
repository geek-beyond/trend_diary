import { faker } from '@faker-js/faker'
import { expect, test } from '../fixtures'
import * as articleHelper from '../helper/article'
import * as userHelper from '../helper/user'
import { AuthPage } from '../pom/auth-page'
import { ArticleDrawer } from '../pom/components/article-drawer'
import { AUTH_FLOW_TIMEOUT, SUPPORTED_ARTICLE_URL_PATTERN } from '../pom/constants'
import { InboxPage } from '../pom/inbox-page'
import { TrendsPage } from '../pom/trends-page'

const MOBILE_VIEWPORT = { width: 375, height: 667 }
const DIGESTION_ARTICLE_COUNT = 3

test.describe('未読消化シナリオ', () => {
  test.describe('ログインから未読消化までの主要フロー(モバイル)', () => {
    test.use({ viewport: MOBILE_VIEWPORT })

    const password = 'Aa1@aaaa'
    const createdArticleIds: bigint[] = []
    // ディスカバリーフェーズでの評価やテスト間共有を避けるため、初期化は beforeAll で行う
    let email = ''

    test.beforeAll(async ({ rdb }) => {
      const suffix = faker.string.alphanumeric(10).toLowerCase()
      email = faker.internet.email({
        firstName: 'e2e',
        lastName: `mobile${suffix}`,
        provider: 'example.com',
        allowSpecialCharacters: false,
      })

      // 一部が失敗しても全プロミスの確定を待ち、成功分の ID を確実に回収してクリーンアップ漏れを防ぐ
      const results = await Promise.allSettled(
        Array.from({ length: DIGESTION_ARTICLE_COUNT }, () => articleHelper.createArticle(rdb)),
      )
      for (const result of results) {
        if (result.status === 'fulfilled') {
          createdArticleIds.push(result.value.articleId)
        }
      }
      const rejectedCount = results.filter((result) => result.status === 'rejected').length
      if (rejectedCount > 0) {
        throw new Error(`記事の作成に失敗しました(${rejectedCount}件)`)
      }
    })

    test.afterAll(async ({ rdb }) => {
      await articleHelper.cleanUp(rdb, createdArticleIds)
      // beforeAll が途中で失敗した場合、空文字での全件一致による意図しない削除を防ぐ
      if (email) {
        await userHelper.cleanUpByEmailPattern(rdb, email)
      }
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
