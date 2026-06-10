import { faker } from '@faker-js/faker'
import { test } from '../fixtures'
import { AuthPage } from '../pom/auth-page'
import { AUTH_SCENARIO_TIMEOUT } from '../pom/constants'

test.describe('ログイン失敗シナリオ', () => {
  const password = 'Aa1@aaaa'

  test('未登録の認証情報ではログインに失敗し、エラーメッセージが表示される', async ({ page }) => {
    test.setTimeout(AUTH_SCENARIO_TIMEOUT)

    // 存在しないメールアドレスにすることで、ユーザー作成・後始末なしに認証失敗を再現する
    const unregisteredEmail = faker.internet.email({
      firstName: 'e2e',
      lastName: `nouser${faker.string.alphanumeric(10).toLowerCase()}`,
      provider: 'example.com',
      allowSpecialCharacters: false,
    })

    const authPage = new AuthPage(page)
    await authPage.gotoLogin()
    await authPage.waitForLoginPage()

    await authPage.submitLogin(unregisteredEmail, password)
    await authPage.expectInvalidCredentialsError()
  })
})
