import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import Logger from '@trend-diary/logger'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { err, ok } from 'neverthrow'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import TEST_ENV from '../test-helper/env'
import { fetchAllArticles } from './fetch-all-articles'
import { runScheduledFetch } from './fetch-articles'
import { RssFetchError } from './rss-client'

vi.mock('./fetch-articles', () => ({
  runScheduledFetch: vi.fn(),
}))

afterEach(() => {
  vi.restoreAllMocks()
})

const runScheduledFetchMock = vi.mocked(runScheduledFetch)
const logger = new Logger('silent')

function buildDiscord() {
  const discord = new DiscordWebhookClient(TEST_ENV.DISCORD_WEBHOOK_URL, logger)
  const sendMessageSpy = vi.spyOn(discord, 'sendMessage').mockResolvedValue(undefined)
  return { discord, sendMessageSpy }
}

function runFetchAllArticles(discord: DiscordWebhookClient, scheduledTime: number) {
  return fetchAllArticles({
    env: TEST_ENV,
    logger,
    discord,
    cron: '0 * * * *',
    scheduledTime,
  })
}

beforeEach(() => {
  runScheduledFetchMock.mockReset()
})

describe('fetchAllArticles', () => {
  describe('準正常系', () => {
    it('一部メディアが失敗した場合は失敗メディアをDiscordへ通知したうえでthrowする', async () => {
      const infoSpy = vi.spyOn(logger, 'info')
      vi.spyOn(Date, 'now').mockReturnValue(100)
      const feedError = new Error('feed error')
      runScheduledFetchMock.mockImplementation(async (media: ArticleMedia) =>
        media === 'hatena' ? err(feedError) : ok(1),
      )
      const { discord, sendMessageSpy } = buildDiscord()

      await expect(runFetchAllArticles(discord, 2000)).rejects.toThrow(
        `cron job failed: 1/${ARTICLE_MEDIA.length} media failed`,
      )

      expect(sendMessageSpy).toHaveBeenCalledTimes(1)
      expect(sendMessageSpy).toHaveBeenCalledWith(
        '[trend-diary cron] fetch failed\ncron: 0 * * * *\nmedia: hatena\nerror: feed error',
      )
      expect(infoSpy).toHaveBeenCalledWith({
        msg: 'cron job completed',
        successCount: ARTICLE_MEDIA.length - 1,
        failedCount: 1,
        insertedTotal: ARTICLE_MEDIA.length - 1,
        durationMs: 0,
      })
      expect(infoSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'cron media fetch completed',
          durationMs: 0,
        }),
      )
    })

    it('RssFetchErrorの場合は診断情報をログとDiscord通知に含める', async () => {
      const diagnostics = {
        status: 429,
        headers: { 'retry-after': '30', 'cf-mitigated': 'challenge' },
        bodySnippet: 'Rate limited',
      }
      const fetchError = new RssFetchError('https://zenn.dev/feed', diagnostics)
      runScheduledFetchMock.mockImplementation(async (media: ArticleMedia) =>
        media === 'zenn' ? err(fetchError) : ok(1),
      )
      const errorLogger = new Logger('silent')
      const errorSpy = vi.spyOn(errorLogger, 'error')
      const discord = new DiscordWebhookClient(TEST_ENV.DISCORD_WEBHOOK_URL, errorLogger)
      const sendMessageSpy = vi.spyOn(discord, 'sendMessage').mockResolvedValue(undefined)

      await expect(
        fetchAllArticles({
          env: TEST_ENV,
          logger: errorLogger,
          discord,
          cron: '0 * * * *',
          scheduledTime: 4000,
        }),
      ).rejects.toThrow()

      expect(errorSpy).toHaveBeenCalledWith(
        expect.objectContaining({ msg: 'cron media fetch failed', media: 'zenn', diagnostics }),
        fetchError,
      )
      expect(sendMessageSpy).toHaveBeenCalledWith(
        [
          '[trend-diary cron] fetch failed',
          'cron: 0 * * * *',
          'media: zenn',
          'error: Failed to fetch rss feed: https://zenn.dev/feed, status=429',
          'headers: retry-after=30, cf-mitigated=challenge',
          'body: Rate limited',
          'note: rate limited (retry on next scheduled run)',
        ].join('\n'),
      )
    })

    it('診断情報が無い場合はDiscord通知に空の診断行を足さない', async () => {
      const fetchError = new RssFetchError('https://zenn.dev/feed', { status: 503, headers: {} })
      runScheduledFetchMock.mockImplementation(async (media: ArticleMedia) =>
        media === 'zenn' ? err(fetchError) : ok(1),
      )
      const { discord, sendMessageSpy } = buildDiscord()

      await expect(runFetchAllArticles(discord, 6000)).rejects.toThrow()

      expect(sendMessageSpy).toHaveBeenCalledWith(
        '[trend-diary cron] fetch failed\ncron: 0 * * * *\nmedia: zenn\nerror: Failed to fetch rss feed: https://zenn.dev/feed, status=503',
      )
    })
  })

  describe('異常系', () => {
    it('runScheduledFetchが例外を送出した場合も失敗として扱いDiscordへ通知したうえでthrowする', async () => {
      runScheduledFetchMock.mockImplementation(async (media: ArticleMedia) => {
        if (media === 'zenn') throw new Error('unexpected error')
        return ok(1)
      })
      const { discord, sendMessageSpy } = buildDiscord()

      await expect(runFetchAllArticles(discord, 3000)).rejects.toThrow(
        `cron job failed: 1/${ARTICLE_MEDIA.length} media failed`,
      )

      expect(sendMessageSpy).toHaveBeenCalledWith(expect.stringContaining('media: zenn'))
      expect(sendMessageSpy).toHaveBeenCalledWith(
        expect.stringContaining('error: unexpected error'),
      )
    })
  })
})
