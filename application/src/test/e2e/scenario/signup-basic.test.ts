import { faker } from '@faker-js/faker'
import { expect, test } from '@playwright/test'
import { AuthPage } from '@/test/e2e/pom/auth-page'
import { ArticleDrawer } from '@/test/e2e/pom/components/article-drawer'
import { AUTH_FLOW_TIMEOUT } from '@/test/e2e/pom/constants'
import { TrendsPage } from '@/test/e2e/pom/trends-page'
import * as articleHelper from '@/test/helper/article'
import * as userHelper from '@/test/helper/user'
import { disposeE2ETestRdb, initE2ETestRdb } from '@/test/setup/e2e-rdb'

// dev サーバと同じ miniflare local D1 へ接続し、本番ハンドラが読む DB へシードする
test.beforeAll(initE2ETestRdb)
test.afterAll(disposeE2ETestRdb)

const AUTH_SCENARIO_TIMEOUT = AUTH_FLOW_TIMEOUT * 3

test.describe('新規登録・ログイン後の記事詳細閲覧シナリオ', () => {
  const password = 'Aa1@aaaa'
  const suffix = faker.string.alphanumeric(10).toLowerCase()
  const email = faker.internet.email({
    firstName: 'e2e',
    lastName: `scenario${suffix}`,
    provider: 'example.com',
    allowSpecialCharacters: false,
  })
  const articleTitle = `E2Eシナリオ記事-${suffix}`

  let createdArticleId: bigint | null = null

  test.beforeAll(async () => {
    const article = await articleHelper.createArticle({
      title: articleTitle,
      media: 'zenn',
    })
    createdArticleId = article.articleId
  })

  test.afterAll(async () => {
    if (createdArticleId) {
      await articleHelper.cleanUp([createdArticleId])
    }

    await userHelper.cleanUpByEmailPattern(email)
  })

  test('ログイン後にトレンド記事の詳細を開ける', async ({ page }) => {
    test.setTimeout(AUTH_SCENARIO_TIMEOUT)

    await expect(async () => {
      const authPage = new AuthPage(page)
      await authPage.gotoSignup()

      const signupResult = await authPage.submitSignup(email, password)
      if (signupResult === 'stayed') {
        await authPage.expectSignupConflictError()
        await authPage.gotoLogin()
      }

      await authPage.waitForLoginPage()

      await authPage.submitLogin(email, password)
      await authPage.waitForTrendsPage()
    }).toPass({ timeout: AUTH_SCENARIO_TIMEOUT })

    {
      const trendsPage = new TrendsPage(page)
      await trendsPage.openArticleByTitle(articleTitle)
    }

    {
      const drawer = new ArticleDrawer(page)
      await drawer.waitOpen()
      await drawer.expectContains(articleTitle)
      await drawer.expectReadArticleButtonVisible()
    }
  })
})
