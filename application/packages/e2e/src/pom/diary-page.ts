import { expect, type Locator, type Page } from '@playwright/test'
import { TIMEOUT } from './constants'

export class DiaryPage {
  private readonly pageTitle: Locator
  private readonly loginRequiredText: Locator
  private readonly readListHeading: Locator
  private readonly emptyReadListText: Locator

  constructor(private readonly page: Page) {
    this.pageTitle = page.getByRole('heading', { name: 'ダイアリー' })
    this.loginRequiredText = page.getByText('この機能はログイン時のみ利用できます。')
    this.readListHeading = page.getByText('読了した記事一覧')
    this.emptyReadListText = page.getByText('読了した記事はまだありません。')
  }

  async goto(): Promise<void> {
    await this.page.goto('/diary')
  }

  async expectTitleVisible(): Promise<void> {
    await expect(this.pageTitle).toBeVisible({ timeout: TIMEOUT })
  }

  async expectLoginRequired(): Promise<void> {
    await expect(this.loginRequiredText).toBeVisible({ timeout: TIMEOUT })
  }

  async expectReadListSection(): Promise<void> {
    await expect(this.readListHeading).toBeVisible({ timeout: TIMEOUT })
  }

  async expectEmptyReadList(): Promise<void> {
    await expect(this.emptyReadListText).toBeVisible({ timeout: TIMEOUT })
  }
}
