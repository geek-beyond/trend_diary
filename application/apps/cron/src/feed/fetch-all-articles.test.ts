import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import Logger from '@trend-diary/logger'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { err, ok } from 'neverthrow'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TEST_ENV from '../test-helper/env'
import { fetchAllArticles } from './fetch-all-articles'
import { runScheduledFetch } from './fetch-articles'
import { RssFetchError } from './rss-client'

vi.mock('./fetch-articles', () => ({
  runScheduledFetch: vi.fn(),
}))

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
  describe('正常系', () => {
    it('全メディアの取得に成功した場合は例外を投げずDiscordへ通知しない', async () => {
      runScheduledFetchMock.mockResolvedValue(ok(1))
      const { discord, sendMessageSpy } = buildDiscord()

      await expect(runFetchAllArticles(discord, 1000)).resolves.toBeUndefined()

      expect(runScheduledFetchMock).toHaveBeenCalledTimes(ARTICLE_MEDIA.length)
      expect(sendMessageSpy).not.toHaveBeenCalled()
    })
  })

  describe('準正常系', () => {
    it('一部メディアが失敗した場合は失敗メディアをDiscordへ通知したうえでthrowする', async () => {
      const feedError = new Error('feed error')
      runScheduledFetchMock.mockImplementation(async (media: ArticleMedia) =>
        media === 'hatena' ? err(feedError) : ok(1),
      )
      const { discord, sendMessageSpy } = buildDiscord()

      await expect(runFetchAllArticles(discord, 2000)).rejects.toThrow(
        `cron job failed: 1/${ARTICLE_MEDIA.length} media failed`,
      )

      expect(sendMessageSpy).toHaveBeenCalledTimes(1)
      expect(sendMessageSpy).toHaveBeenCalledWith(expect.stringContaining('media: hatena'))
      expect(sendMessageSpy).toHaveBeenCalledWith(expect.stringContaining('error: feed error'))
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
        expect.stringContaining('headers: retry-after=30, cf-mitigated=challenge'),
      )
      expect(sendMessageSpy).toHaveBeenCalledWith(expect.stringContaining('body: Rate limited'))
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
