import { expect, type Locator, type Page } from '@playwright/test'
import { TIMEOUT } from '@/test/e2e/pom/constants'

type WindowWithLastOpenedUrl = Window & {
  lastOpenedUrl?: string
}

export class ArticleDrawer {
  private readonly drawer: Locator
  private readonly closeButton: Locator
  private readonly readArticleButton: Locator
  private readonly descriptionContent: Locator

  constructor(private readonly page: Page) {
    this.drawer = page
      .getByRole('dialog')
      .filter({ has: page.getByRole('button', { name: '記事を読む' }) })
    this.closeButton = this.drawer.getByRole('button', { name: 'Close' })
    this.readArticleButton = this.drawer.getByRole('button', { name: '記事を読む' })
    this.descriptionContent = this.drawer.locator(
      "[data-slot='drawer-content-description-content']",
    )
  }

  async waitOpen(): Promise<void> {
    await this.drawer.waitFor({ state: 'visible', timeout: TIMEOUT })
    await expect(this.drawer).toBeVisible({ timeout: TIMEOUT })
  }

  async close(): Promise<void> {
    await this.waitOpen()
    await this.closeButton.click()
  }

  async expectClosed(): Promise<void> {
    await this.drawer.waitFor({ state: 'hidden', timeout: TIMEOUT })
    await expect(this.drawer).not.toBeVisible()
  }

  async expectContains(text: string): Promise<void> {
    await expect(this.drawer).toContainText(text)
  }

  async expectReadArticleButtonVisible(): Promise<void> {
    await expect(this.readArticleButton).toBeVisible({ timeout: TIMEOUT })
  }

  async clickReadArticle(): Promise<void> {
    await this.expectReadArticleButtonVisible()
    await this.readArticleButton.click()
  }

  async expectDescriptionToggle(label: '続きを読む' | '閉じる'): Promise<void> {
    await expect(this.drawer.getByRole('button', { name: label })).toBeVisible({ timeout: TIMEOUT })
  }

  async clickDescriptionToggle(label: '続きを読む' | '閉じる'): Promise<void> {
    const toggleButton = this.drawer.getByRole('button', { name: label })
    await expect(toggleButton).toBeVisible({ timeout: TIMEOUT })
    await toggleButton.click()
  }

  async expectDescriptionCollapsed(): Promise<void> {
    await expect(this.descriptionContent).toHaveClass(/line-clamp-4/)
  }

  async expectDescriptionExpanded(): Promise<void> {
    await expect(this.descriptionContent).not.toHaveClass(/line-clamp-4/)
  }

  async mockWindowOpen(): Promise<void> {
    await this.page.evaluate(() => {
      const currentWindow = window as WindowWithLastOpenedUrl
      window.open = (url: string | URL | undefined) => {
        if (url) {
          currentWindow.lastOpenedUrl = url.toString()
        }

        return null
      }
    })
  }

  async getLastOpenedUrl(): Promise<string> {
    return this.page.evaluate(() => {
      const currentWindow = window as WindowWithLastOpenedUrl
      return currentWindow.lastOpenedUrl ?? ''
    })
  }
}
