import { expect, type Page } from '@playwright/test'
import { TIMEOUT } from '../constants'

// sonner のトーストはテキストで確認する(役割属性は表示種別で変わるため)
export class Toast {
  constructor(private readonly page: Page) {}

  async expectText(text: string): Promise<void> {
    await expect(this.page.getByText(text)).toBeVisible({ timeout: TIMEOUT })
  }
}
