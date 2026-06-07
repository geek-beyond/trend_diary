import { expect, type Locator, type Page } from '@playwright/test'
import { TIMEOUT } from '@/test/e2e/pom/constants'

export class TrendsPage {
  private readonly noArticlesMessage: Locator
  private readonly articleCards: Locator
  private readonly qiitaIcons: Locator
  private readonly zennIcons: Locator
  private readonly hatenaIcons: Locator

  constructor(private readonly page: Page) {
    this.noArticlesMessage = page.getByText('記事がありません')
    this.articleCards = page
      .getByRole('button')
      .filter({ has: page.getByRole('img', { name: /(?:qiita|zenn|hatena) icon/ }) })
    this.qiitaIcons = page.getByRole('img', { name: 'qiita icon' })
    this.zennIcons = page.getByRole('img', { name: 'zenn icon' })
    this.hatenaIcons = page.getByRole('img', { name: 'hatena icon' })
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

  async expectNoArticlesMessage(): Promise<void> {
    await expect(this.noArticlesMessage).toBeVisible({ timeout: TIMEOUT })
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

  async expectArticleCount(count: number): Promise<void> {
    await expect(this.articleCards).toHaveCount(count)
  }

  async expectQiitaIconCount(count: number): Promise<void> {
    await expect(this.qiitaIcons).toHaveCount(count)
  }

  async expectZennIconCount(count: number): Promise<void> {
    await expect(this.zennIcons).toHaveCount(count)
  }

  async expectHatenaIconCount(count: number): Promise<void> {
    await expect(this.hatenaIcons).toHaveCount(count)
  }

  async waitForUrl(url: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(url, { timeout: TIMEOUT })
  }

  expectQueryParamNull(paramName: string): void {
    const url = new URL(this.page.url())
    expect(url.searchParams.get(paramName)).toBeNull()
  }

  expectQueryParamPresent(paramName: string): void {
    const url = new URL(this.page.url())
    expect(url.searchParams.get(paramName)).not.toBeNull()
  }
}
