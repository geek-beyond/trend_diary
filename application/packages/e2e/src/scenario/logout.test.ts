import { faker } from '@faker-js/faker'
import { expect, test } from '../fixtures'
import * as userHelper from '../helper/user'
import { AppSidebar } from '../pom/app-sidebar'
import { AuthPage } from '../pom/auth-page'
import { Toast } from '../pom/components/toast'
import { AUTH_SCENARIO_TIMEOUT } from '../pom/constants'

test.describe('ログアウトシナリオ', () => {
  const password = 'Aa1@aaaa'
  const suffix = faker.string.alphanumeric(10).toLowerCase()
  const email = faker.internet.email({
    firstName: 'e2e',
    lastName: `logout${suffix}`,
    provider: 'example.com',
    allowSpecialCharacters: false,
  })

  test.afterAll(async ({ rdb }) => {
    await userHelper.cleanUpByEmailPattern(rdb, email)
  })

  test('ログイン後にログアウトするとログイン画面へ戻る', async ({ page }) => {
    test.setTimeout(AUTH_SCENARIO_TIMEOUT)

    const authPage = new AuthPage(page)
    await authPage.signupThenLogin(email, password)

    const sidebar = new AppSidebar(page)
    await sidebar.logout()

    await expect(page).toHaveURL(/\/login(?:\?.*)?$/, { timeout: AUTH_SCENARIO_TIMEOUT })

    const toast = new Toast(page)
    await toast.expectText('ログアウトしました')
  })
})
