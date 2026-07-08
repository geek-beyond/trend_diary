import { expect, type Locator, type Page } from '@playwright/test'
import { TIMEOUT } from './constants'

export class TrendsPage {
  private readonly articleCards: Locator

  constructor(private readonly page: Page) {
    this.articleCards = page.getByTestId('article-card')
  }

  async goto(path = '/trends'): Promise<void> {
    await this.page.goto(path)
  }

  async waitForArticleCards(): Promise<void> {
    // INFO: API依存の待機は環境差で不安定なので、UI描画を直接待つ
    await expect
      .poll(async () => this.articleCards.count(), { timeout: TIMEOUT })
      .toBeGreaterThan(0)

    await expect(this.firstArticleCard()).toBeVisible({ timeout: TIMEOUT })
  }

  firstArticleCard(): Locator {
    return this.articleCards.first()
  }

  async openFirstArticle(): Promise<void> {
    await expect(this.firstArticleCard()).toBeVisible({ timeout: TIMEOUT })
    await this.firstArticleCard().click()
  }

  async openArticleByTitle(title: string): Promise<void> {
    const articleCard = this.articleCards.filter({ hasText: title }).first()
    await expect(articleCard).toBeVisible({ timeout: TIMEOUT })
    await articleCard.click()
  }
}
