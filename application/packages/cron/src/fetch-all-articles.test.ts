import Logger from '@trend-diary/common/logger'
import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { err, ok, type Result } from 'neverthrow'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchAllArticles } from './fetch-all-articles'
import { runScheduledFetch } from './fetch-articles'
import TEST_ENV from './test-helper/env'

vi.mock('./fetch-articles', () => ({
  runScheduledFetch: vi.fn(),
}))

const runScheduledFetchMock = vi.mocked(runScheduledFetch)

const logger = new Logger('silent')

function createDiscordStub(): DiscordWebhookClient {
  const discord = new DiscordWebhookClient(TEST_ENV.DISCORD_WEBHOOK_URL, logger)
  vi.spyOn(discord, 'sendMessage').mockResolvedValue(undefined)
  return discord
}

function callFetchAllArticles(discord: DiscordWebhookClient): Promise<void> {
  return fetchAllArticles({
    env: TEST_ENV,
    logger,
    discord,
    cron: '0 */1 * * *',
    scheduledTime: 1000,
  })
}

beforeEach(() => {
  runScheduledFetchMock.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('fetchAllArticles', () => {
  describe('正常系', () => {
    it('全メディアのフェッチ結果を集計し、Discord通知は行わない', async () => {
      const inserted: Record<ArticleMedia, number> = { qiita: 2, zenn: 1, hatena: 3 }
      runScheduledFetchMock.mockImplementation((media) => Promise.resolve(ok(inserted[media])))
      const discord = createDiscordStub()

      await expect(callFetchAllArticles(discord)).resolves.toBeUndefined()

      expect(runScheduledFetchMock).toHaveBeenCalledTimes(ARTICLE_MEDIA.length)
      expect(discord.sendMessage).not.toHaveBeenCalled()
    })

    it('メディア単位のフェッチを直列ではなく並列で実行する', async () => {
      let activeCount = 0
      let peakConcurrency = 0
      // 各フェッチが完了する前に他メディアが開始しているかでpeakを測り、並列性を検証する
      runScheduledFetchMock.mockImplementation(async () => {
        activeCount += 1
        peakConcurrency = Math.max(peakConcurrency, activeCount)
        await new Promise((resolve) => setTimeout(resolve, 10))
        activeCount -= 1
        return ok(0)
      })

      await callFetchAllArticles(createDiscordStub())

      expect(peakConcurrency).toBe(ARTICLE_MEDIA.length)
    })
  })

  describe('異常系', () => {
    it('一部メディアが失敗するとDiscordへ通知し、失敗件数を含むエラーを投げる', async () => {
      const failures: Partial<Record<ArticleMedia, Result<number, Error>>> = {
        hatena: err(new Error('boom')),
      }
      runScheduledFetchMock.mockImplementation((media) => Promise.resolve(failures[media] ?? ok(1)))
      const discord = createDiscordStub()

      await expect(callFetchAllArticles(discord)).rejects.toThrow(
        `cron job failed: 1/${ARTICLE_MEDIA.length} media failed`,
      )

      expect(discord.sendMessage).toHaveBeenCalledTimes(1)
      expect(discord.sendMessage).toHaveBeenCalledWith(expect.stringContaining('media: hatena'))
    })

    it('runScheduledFetchが例外でrejectしても失敗として集計し処理を継続する', async () => {
      runScheduledFetchMock.mockImplementation((media) =>
        media === 'zenn' ? Promise.reject(new Error('unexpected')) : Promise.resolve(ok(0)),
      )
      const discord = createDiscordStub()

      await expect(callFetchAllArticles(discord)).rejects.toThrow(
        `cron job failed: 1/${ARTICLE_MEDIA.length} media failed`,
      )

      expect(discord.sendMessage).toHaveBeenCalledWith(expect.stringContaining('media: zenn'))
    })
  })
})
