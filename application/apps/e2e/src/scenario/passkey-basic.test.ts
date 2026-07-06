import { faker } from '@faker-js/faker'
import { expect, test } from '../fixtures'
import * as userHelper from '../helper/user'
import { AuthPage } from '../pom/auth-page'
import { AUTH_FLOW_TIMEOUT } from '../pom/constants'
import { PasskeyPage } from '../pom/passkey-page'

// パスキー(WebAuthn)登録→ログインのハッピーパス。実際の supabase CLI に対して実行する。
// supabase CLI は passkey 対応済み（config.toml の [auth.passkey]/[auth.webauthn] を有効化）。
// ceremony は Playwright の CDP 仮想オーセンティケータ(WebAuthn.addVirtualAuthenticator)で通す。
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

    // ceremony 前に仮想オーセンティケータを有効化する
    await PasskeyPage.enableVirtualAuthenticator(page)

    const authPage = new AuthPage(page)
    const passkeyPage = new PasskeyPage(page)

    // 1. メール+パスワードで新規登録し、ログインする
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

    // 2. 設定ページのトグルでパスキーを登録する
    await passkeyPage.registerPasskeyFromSettings()

    // 3. ログアウトする
    await passkeyPage.logout()

    // 4. パスキーでログインし、/trends へ遷移する
    await passkeyPage.loginWithPasskey()
    await authPage.waitForTrendsPage()
  })
})
