import { expect, type Locator, type Page } from '@playwright/test'
import type { ArticleMedia } from '@trend-diary/domain/article/media'
import { TIMEOUT } from '../constants'

type MediaOption = 'all' | ArticleMedia

export class DesktopMediaFilter {
  private readonly allOption: Locator
  private readonly qiitaOption: Locator
  private readonly zennOption: Locator
  private readonly hatenaOption: Locator

  constructor(private readonly page: Page) {
    this.allOption = page.locator("[data-slot='media-filter-all']")
    this.qiitaOption = page.locator("[data-slot='media-filter-qiita']")
    this.zennOption = page.locator("[data-slot='media-filter-zenn']")
    this.hatenaOption = page.locator("[data-slot='media-filter-hatena']")
  }

  async expectVisible(): Promise<void> {
    await this.allOption.waitFor({ state: 'visible', timeout: TIMEOUT })
    await expect(this.qiitaOption).toBeVisible()
    await expect(this.zennOption).toBeVisible()
    await expect(this.hatenaOption).toBeVisible()
  }

  async select(media: MediaOption): Promise<void> {
    await this.option(media).click()
  }

  private option(media: MediaOption): Locator {
    if (media === 'all') return this.allOption
    if (media === 'qiita') return this.qiitaOption
    if (media === 'zenn') return this.zennOption
    return this.hatenaOption
  }
}
