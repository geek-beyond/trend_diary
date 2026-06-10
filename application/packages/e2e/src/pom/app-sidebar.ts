import { expect, type Locator, type Page } from '@playwright/test'
import { TIMEOUT } from './constants'

// デスクトップ表示のサイドバー(`hidden md:block`)を操作する。
// モバイル幅では Sheet 側に同等メニューが出るため、デスクトップ viewport を前提とする。
export class AppSidebar {
  private readonly logoutButton: Locator
  private readonly diaryLink: Locator

  constructor(private readonly page: Page) {
    this.logoutButton = page.getByRole('button', { name: 'ログアウト' })
    this.diaryLink = page.getByRole('link', { name: 'ダイアリー' })
  }

  async expectLogoutVisible(): Promise<void> {
    await expect(this.logoutButton).toBeVisible({ timeout: TIMEOUT })
  }

  async logout(): Promise<void> {
    await this.expectLogoutVisible()
    await this.logoutButton.click()
  }

  async gotoDiary(): Promise<void> {
    await expect(this.diaryLink).toBeVisible({ timeout: TIMEOUT })
    await this.diaryLink.click()
  }
}
