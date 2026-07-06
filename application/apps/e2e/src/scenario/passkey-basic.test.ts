import { faker } from '@faker-js/faker'
import { expect, test } from '../fixtures'
import * as userHelper from '../helper/user'
import { AuthPage } from '../pom/auth-page'
import { AUTH_FLOW_TIMEOUT } from '../pom/constants'
import { PasskeyPage } from '../pom/passkey-page'

// ブラウザの WebAuthn ceremony は実オーセンティケータを介すため、CDP 仮想オーセンティケータで代替する。
// passkey は supabase CLI 側で有効化が要るため config.toml の [auth.passkey]/[auth.webauthn] を有効化している。
const SCENARIO_TIMEOUT = AUTH_FLOW_TIMEOUT * 4

test.describe('パスキー登録・ログインシナリオ', () => {
  const password = 'Aa1@aaaa'
  const suffix = faker.string.alphanumeric(10).toLowerCase()
  const email = faker.internet.email({
    firstName: 'e2e',
    lastName: `passkey${suffix}`,
    provider: 'example.com',
    allowSpecialCharacters: false,
  })

  test.afterAll(async ({ rdb }) => {
    await userHelper.cleanUpByEmailPattern(rdb, email)
  })

  test('パスキーを登録し、パスキーでログインできる', async ({ page }) => {
    test.setTimeout(SCENARIO_TIMEOUT)

    // ceremony より前に有効化しないと資格情報を生成できない
    await PasskeyPage.enableVirtualAuthenticator(page)

    const authPage = new AuthPage(page)
    const passkeyPage = new PasskeyPage(page)

    await expect(async () => {
      await authPage.gotoSignup()

      const signupResult = await authPage.submitSignup(email, password)
      if (signupResult === 'stayed') {
        await authPage.expectSignupConflictError()
        await authPage.gotoLogin()
      }

      await authPage.waitForLoginPage()
      await authPage.submitLogin(email, password)
      await authPage.waitForTrendsPage()
    }).toPass({ timeout: SCENARIO_TIMEOUT })

    await passkeyPage.registerPasskeyFromSettings()
    await passkeyPage.logout()

    await passkeyPage.loginWithPasskey()
    await authPage.waitForTrendsPage()
  })
})
