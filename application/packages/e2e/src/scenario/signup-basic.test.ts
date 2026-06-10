import { faker } from '@faker-js/faker'
import { test } from '../fixtures'
import * as articleHelper from '../helper/article'
import * as userHelper from '../helper/user'
import { AppSidebar } from '../pom/app-sidebar'
import { AuthPage } from '../pom/auth-page'
import { ArticleDrawer } from '../pom/components/article-drawer'
import { Toast } from '../pom/components/toast'
import { AUTH_SCENARIO_TIMEOUT } from '../pom/constants'
import { TrendsPage } from '../pom/trends-page'

test.describe('新規登録・ログイン・記事詳細閲覧・ログアウトシナリオ', () => {
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

  test('ログイン後にトレンド記事の詳細を開き、ログアウトできる', async ({ page }) => {
    test.setTimeout(AUTH_SCENARIO_TIMEOUT)

    const authPage = new AuthPage(page)
    await authPage.signupThenLogin(email, password)

    {
      const trendsPage = new TrendsPage(page)
      await trendsPage.openArticleByTitle(articleTitle)
    }

    {
      const drawer = new ArticleDrawer(page)
      await drawer.waitOpen()
      await drawer.expectContains(articleTitle)
      await drawer.expectReadArticleButtonVisible()
      // サイドバーのログアウトはモーダル背後に隠れるため、先にドロワーを閉じる
      await drawer.close()
      await drawer.expectClosed()
    }

    {
      const sidebar = new AppSidebar(page)
      await sidebar.logout()

      await authPage.waitForLoginPage()

      const toast = new Toast(page)
      await toast.expectText('ログアウトしました')
    }
  })
})
