import { faker } from '@faker-js/faker'
import { test } from '../fixtures'
import * as articleHelper from '../helper/article'
import * as userHelper from '../helper/user'
import { AuthPage } from '../pom/auth-page'
import { ArticleDrawer } from '../pom/components/article-drawer'
import { AUTH_FLOW_TIMEOUT } from '../pom/constants'
import { TrendsPage } from '../pom/trends-page'

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

  test.beforeAll(async ({ rdb }) => {
    const article = await articleHelper.createArticle(rdb, {
      title: articleTitle,
      media: 'zenn',
    })
    createdArticleId = article.articleId
  })

  test.afterAll(async ({ rdb }) => {
    if (createdArticleId) {
      await articleHelper.cleanUp(rdb, [createdArticleId])
    }

    await userHelper.cleanUpByEmailPattern(rdb, email)
  })

  test('ログイン後にトレンド記事の詳細を開ける', async ({ page }) => {
    test.setTimeout(AUTH_SCENARIO_TIMEOUT)

    const authPage = new AuthPage(page)
    await authPage.gotoSignup()

    const signupResult = await authPage.submitSignup(email, password)
    if (signupResult === 'stayed') {
      await authPage.expectSignupConflictError()
      await authPage.gotoLogin()
    }

    await authPage.waitForLoginPage()
    await authPage.expectGithubLoginVisible()

    await authPage.submitLogin(email, password)
    await authPage.waitForTrendsPage()

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
