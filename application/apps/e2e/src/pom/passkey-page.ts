import { expect, type Locator, type Page } from '@playwright/test'
import { AUTH_FLOW_TIMEOUT } from './constants'

export class PasskeyPage {
  private readonly toggle: Locator
  private readonly loginButton: Locator
  private readonly logoutButton: Locator

  constructor(private readonly page: Page) {
    this.toggle = page.getByRole('switch', { name: 'パスキーを有効にする' })
    this.loginButton = page.getByRole('button', { name: 'パスキーでログイン' })
    this.logoutButton = page.getByRole('button', { name: 'ログアウト' })
  }

  // CDPの仮想オーセンティケータを登録する。resident keyでdiscoverableにし、
  // ユーザー操作なしで ceremony を通す（isUserVerified + automaticPresenceSimulation）。
  // ログイン(usernameless)でも同じ資格情報を引けるよう ceremony 前に有効化しておく。
  static async enableVirtualAuthenticator(page: Page): Promise<void> {
    const client = await page.context().newCDPSession(page)
    await client.send('WebAuthn.enable')
    await client.send('WebAuthn.addVirtualAuthenticator', {
      options: {
        protocol: 'ctap2',
        transport: 'internal',
        hasResidentKey: true,
        hasUserVerification: true,
        isUserVerified: true,
        automaticPresenceSimulation: true,
      },
    })
  }

  async registerPasskeyFromSettings(): Promise<void> {
    await this.page.goto('/settings')
    await expect(this.toggle).toBeVisible({ timeout: AUTH_FLOW_TIMEOUT })
    await expect(this.toggle).not.toBeChecked()

    await this.toggle.click()
    // 登録成功後は状態を取り直してトグルがONになる
    await expect(this.toggle).toBeChecked({ timeout: AUTH_FLOW_TIMEOUT })
  }

  async logout(): Promise<void> {
    await this.logoutButton.click()
    await expect(this.loginButton).toBeVisible({ timeout: AUTH_FLOW_TIMEOUT })
  }

  async loginWithPasskey(): Promise<void> {
    await expect(this.loginButton).toBeVisible({ timeout: AUTH_FLOW_TIMEOUT })
    await this.loginButton.click()
  }
}
