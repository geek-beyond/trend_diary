import { faker } from '@faker-js/faker'
import { test } from '../fixtures'
import * as userHelper from '../helper/user'
import { AuthPage } from '../pom/auth-page'
import { AppSidebar } from '../pom/components/app-sidebar'
import { Toast } from '../pom/components/toast'
import { AUTH_SCENARIO_TIMEOUT } from '../pom/constants'

test.describe('認証シナリオ', () => {
  const password = 'Aa1@aaaa'
  const suffix = faker.string.alphanumeric(10).toLowerCase()
  const email = faker.internet.email({
    firstName: 'e2e',
    lastName: `scenario${suffix}`,
    provider: 'example.com',
    allowSpecialCharacters: false,
  })

  test.afterAll(async ({ rdb }) => {
    await userHelper.cleanUpByEmailPattern(rdb, email)
  })

  test('新規ユーザーがアカウントを作成してログインし、ログアウトできる', async ({ page }) => {
    test.setTimeout(AUTH_SCENARIO_TIMEOUT)

    const authPage = new AuthPage(page)

    await authPage.gotoSignup()
    await authPage.submitSignup(email, password)
    await authPage.waitForLoginPage()

    await authPage.submitLogin(email, password)
    await authPage.waitForTrendsPage()

    const sidebar = new AppSidebar(page)
    await sidebar.logout()

    await authPage.waitForLoginPage()
    await new Toast(page).expectText('ログアウトしました')
  })
})
