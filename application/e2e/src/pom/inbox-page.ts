import { expect, type Locator, type Page } from '@playwright/test'
import { TIMEOUT } from './constants'

// window.open を差し替えて「読む」で開かれた URL を検証に使うため、Window 型を拡張する
declare global {
  interface Window {
    lastInboxOpenedUrl?: string
  }
}

export class InboxPage {
  private readonly heading: Locator
  private readonly remainingText: Locator
  private readonly skipButton: Locator
  private readonly readButton: Locator
  private readonly laterButton: Locator

  constructor(private readonly page: Page) {
    this.heading = this.page.getByRole('heading', { name: '未読消化', level: 1 })
    this.remainingText = this.page.getByText(/^残り \d+ 件$/)
    this.skipButton = this.page.getByRole('button', { name: 'スキップ' })
    this.readButton = this.page.getByRole('button', { name: '読む', exact: true })
    this.laterButton = this.page.getByRole('button', { name: '後で' })
  }

  async goto(): Promise<void> {
    await this.page.goto('/inbox')
    await expect(this.heading).toBeVisible({ timeout: TIMEOUT })
  }

  async waitForArticleCard(): Promise<void> {
    await expect(this.skipButton).toBeVisible({ timeout: TIMEOUT })
    await expect(this.readButton).toBeVisible({ timeout: TIMEOUT })
    await expect(this.laterButton).toBeVisible({ timeout: TIMEOUT })
  }

  async remainingCount(): Promise<number> {
    const text = await this.remainingText.textContent()
    const matched = text?.match(/(\d+)/)
    return matched ? Number(matched[1]) : 0
  }

  async expectRemainingCount(count: number): Promise<void> {
    await expect(this.remainingText).toHaveText(`残り ${count} 件`, { timeout: TIMEOUT })
  }

  async skipCurrent(): Promise<void> {
    await this.skipButton.click()
  }

  async readCurrent(): Promise<void> {
    await this.readButton.click()
  }

  async mockWindowOpen(): Promise<void> {
    await this.page.evaluate(() => {
      window.open = (url) => {
        if (url) {
          window.lastInboxOpenedUrl = url.toString()
        }
        return null
      }
    })
  }

  async getLastOpenedUrl(): Promise<string> {
    return this.page.evaluate(() => window.lastInboxOpenedUrl ?? '')
  }
}
