import { expect, type Locator, type Page } from '@playwright/test'
import type { ArticleMedia } from '@trend-diary/domain/article/media'
import { TIMEOUT } from '../constants'

type MediaOption = 'all' | ArticleMedia
type DatePresetOption = 'today' | 'last3days' | 'last7days'

export class MobileFilterPanel {
  private readonly trigger: Locator
  private readonly allOption: Locator
  private readonly qiitaOption: Locator
  private readonly zennOption: Locator
  private readonly hatenaOption: Locator
  private readonly todayDateOption: Locator
  private readonly last3DaysDateOption: Locator
  private readonly last7DaysDateOption: Locator
  private readonly applyButton: Locator
  private readonly clearButton: Locator

  constructor(private readonly page: Page) {
    this.trigger = page.getByRole('button', { name: '絞り込み' })
    this.allOption = page.locator("[data-slot='media-filter-all']")
    this.qiitaOption = page.locator("[data-slot='media-filter-qiita']")
    this.zennOption = page.locator("[data-slot='media-filter-zenn']")
    this.hatenaOption = page.locator("[data-slot='media-filter-hatena']")
    this.todayDateOption = page.locator("[data-slot='date-preset-filter-today']")
    this.last3DaysDateOption = page.locator("[data-slot='date-preset-filter-last3days']")
    this.last7DaysDateOption = page.locator("[data-slot='date-preset-filter-last7days']")
    this.applyButton = page.locator("[data-slot='mobile-filter-apply']")
    this.clearButton = page.locator("[data-slot='mobile-filter-clear']")
  }

  async expectTriggerLabel(label: string): Promise<void> {
    await this.trigger.waitFor({ state: 'visible', timeout: TIMEOUT })
    await expect(this.trigger).toContainText(label)
  }

  async openPanel(): Promise<void> {
    await this.trigger.waitFor({ state: 'visible', timeout: TIMEOUT })
    await this.trigger.click()
    await this.applyButton.waitFor({ state: 'visible', timeout: TIMEOUT })
  }

  async select(media: MediaOption): Promise<void> {
    await this.applyButton.waitFor({ state: 'visible', timeout: TIMEOUT })
    const option = this.option(media)
    await option.waitFor({ state: 'visible', timeout: TIMEOUT })
    await option.click()
  }

  async selectDatePreset(preset: DatePresetOption): Promise<void> {
    await this.applyButton.waitFor({ state: 'visible', timeout: TIMEOUT })
    const option = this.dateOption(preset)
    await option.waitFor({ state: 'visible', timeout: TIMEOUT })
    await option.click()
  }

  async apply(): Promise<void> {
    await this.applyButton.click()
  }

  async clear(): Promise<void> {
    await this.clearButton.click()
  }

  private option(media: MediaOption): Locator {
    if (media === 'all') return this.allOption
    if (media === 'qiita') return this.qiitaOption
    if (media === 'zenn') return this.zennOption
    return this.hatenaOption
  }

  private dateOption(preset: DatePresetOption): Locator {
    if (preset === 'today') return this.todayDateOption
    if (preset === 'last3days') return this.last3DaysDateOption
    return this.last7DaysDateOption
  }
}
