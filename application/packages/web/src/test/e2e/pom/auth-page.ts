import { expect, type Locator, type Page } from '@playwright/test'
import { AUTH_FLOW_TIMEOUT } from '@/test/e2e/pom/constants'

export class AuthPage {
  private readonly emailInput: Locator
  private readonly passwordInput: Locator
  private readonly signupButton: Locator
  private readonly loginButton: Locator
  private readonly loginPageText: Locator
  private readonly signupConflictErrorText: Locator
  private readonly trendsPageText: Locator
  private readonly readStatusFilter: Locator

  constructor(private readonly page: Page) {
    this.emailInput = page.getByLabel('メールアドレス')
    this.passwordInput = page.getByLabel('パスワード')
    this.signupButton = page.getByRole('button', { name: 'アカウント作成' })
    this.loginButton = page.getByRole('button', { name: 'ログイン' })
    this.loginPageText = page.getByText('アカウントをお持ちでないですか？')
    this.signupConflictErrorText = page.getByText('このメールアドレスは既に使用されています')
    this.trendsPageText = page.getByText('絞り込み')
    this.readStatusFilter = page.getByRole('button', { name: '未読のみ' })
  }

  async gotoSignup(): Promise<void> {
    await this.page.goto('/signup')
  }

  async gotoLogin(): Promise<void> {
    await this.page.goto('/login')
  }

  async submitSignup(email: string, password: string): Promise<'redirected-to-login' | 'stayed'> {
    await this.fillCredentials(email, password)
    await this.signupButton.click()

    return Promise.race([
      this.page
        .waitForURL(/\/login(?:\?.*)?$/, { timeout: AUTH_FLOW_TIMEOUT })
        .then(() => 'redirected-to-login' as const),
      this.signupConflictErrorText
        .waitFor({ state: 'visible', timeout: AUTH_FLOW_TIMEOUT })
        .then(() => 'stayed' as const),
    ])
  }

  async waitForLoginPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/login(?:\?.*)?$/, { timeout: AUTH_FLOW_TIMEOUT })
    await expect(this.loginPageText).toBeVisible({ timeout: 5000 })
  }

  async submitLogin(email: string, password: string): Promise<void> {
    await this.fillCredentials(email, password)
    await this.loginButton.click()
  }

  async expectSignupConflictError(): Promise<void> {
    await expect(this.signupConflictErrorText).toBeVisible({ timeout: AUTH_FLOW_TIMEOUT })
  }

  async waitForTrendsPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/trends(?:\?.*)?$/, { timeout: AUTH_FLOW_TIMEOUT })
    await expect(this.trendsPageText).toBeVisible({ timeout: 5000 })
    await expect(this.readStatusFilter).toBeVisible({ timeout: 5000 })
  }

  private async fillCredentials(email: string, password: string): Promise<void> {
    await this.waitForFormReady()

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await this.emailInput.fill(email)
      await this.passwordInput.fill(password)

      const currentEmail = await this.emailInput.inputValue()
      const currentPassword = await this.passwordInput.inputValue()

      if (currentEmail === email && currentPassword === password) {
        return
      }

      await this.page.waitForTimeout(100)
    }

    throw new Error('failed to fill auth credentials')
  }

  private async waitForFormReady(): Promise<void> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(this.emailInput).toBeVisible()
      await expect(this.passwordInput).toBeVisible()

      const probeEmail = `ready-check-${attempt}@example.com`
      await this.emailInput.fill(probeEmail)
      await this.page.waitForTimeout(200)

      if ((await this.emailInput.inputValue()) === probeEmail) {
        await this.emailInput.fill('')
        await this.passwordInput.fill('')
        return
      }

      await this.page.waitForTimeout(200)
    }

    throw new Error('auth form is not ready')
  }
}
