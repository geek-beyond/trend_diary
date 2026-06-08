import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import worker from './worker'

const runScheduledFetchMock = vi.hoisted(() => vi.fn())
const loggerInfoMock = vi.hoisted(() => vi.fn())
const loggerErrorMock = vi.hoisted(() => vi.fn())
const sendMessageMock = vi.hoisted(() => vi.fn())

vi.mock('./fetch-articles', () => ({
  runScheduledFetch: runScheduledFetchMock,
}))

vi.mock('@trend-diary/notification', () => ({
  DiscordWebhookClient: class {
    sendMessage = sendMessageMock
  },
}))

vi.mock('@trend-diary/common/logger', () => ({
  default: class MockLogger {
    info(message: unknown) {
      loggerInfoMock(message)
    }

    error(message: unknown, error: unknown) {
      loggerErrorMock(message, error)
    }
  },
}))

describe('cron worker', () => {
  beforeEach(() => {
    runScheduledFetchMock.mockReset()
    loggerInfoMock.mockReset()
    loggerErrorMock.mockReset()
    sendMessageMock.mockReset()
  })

  it('既知のcron式でfetchジョブを実行する', async () => {
    runScheduledFetchMock.mockResolvedValue(3)

    const waitUntilCalls: Promise<unknown>[] = []
    const event = { cron: '0 */8 * * *', scheduledTime: 1000 } as ScheduledController
    const env = {
      DB: {} as D1Database,
      DISCORD_WEBHOOK_URL: '',
      LOG_LEVEL: 'silent' as const,
    }

    await worker.scheduled(event, env, {
      waitUntil: (promise: Promise<unknown>) => {
        waitUntilCalls.push(promise)
      },
    } as ExecutionContext)

    expect(waitUntilCalls).toHaveLength(1)
    await Promise.all(waitUntilCalls)
    expect(runScheduledFetchMock).toHaveBeenCalledTimes(ARTICLE_MEDIA.length)
    expect(runScheduledFetchMock).toHaveBeenNthCalledWith(1, 'qiita', env)
    expect(runScheduledFetchMock).toHaveBeenNthCalledWith(2, 'zenn', env)
    expect(runScheduledFetchMock).toHaveBeenNthCalledWith(3, 'hatena', env)

    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'cron job started',
        scheduledTime: 1000,
        mediaCount: ARTICLE_MEDIA.length,
      }),
    )
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'cron media fetch started', media: 'qiita' }),
    )
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'cron media fetch started', media: 'zenn' }),
    )
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'cron media fetch started', media: 'hatena' }),
    )
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'cron media fetch completed',
        media: 'qiita',
        insertedCount: 3,
      }),
    )
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'cron media fetch completed',
        media: 'zenn',
        insertedCount: 3,
      }),
    )
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'cron media fetch completed',
        media: 'hatena',
        insertedCount: 3,
      }),
    )
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'cron job completed',
        successCount: ARTICLE_MEDIA.length,
        failedCount: 0,
        insertedTotal: 9,
      }),
    )
  })

  it('cron式に関係なくfetchジョブを実行する', async () => {
    runScheduledFetchMock.mockResolvedValue(0)

    const waitUntilCalls: Promise<unknown>[] = []
    const event = { cron: '5 * * * *', scheduledTime: 2000 } as ScheduledController
    const env = {
      DB: {} as D1Database,
      DISCORD_WEBHOOK_URL: '',
      LOG_LEVEL: 'silent' as const,
    }

    await worker.scheduled(event, env, {
      waitUntil: (promise: Promise<unknown>) => {
        waitUntilCalls.push(promise)
      },
    } as ExecutionContext)

    expect(waitUntilCalls).toHaveLength(1)
    await Promise.all(waitUntilCalls)
    expect(runScheduledFetchMock).toHaveBeenCalledTimes(ARTICLE_MEDIA.length)
    expect(runScheduledFetchMock).toHaveBeenNthCalledWith(1, 'qiita', env)
    expect(runScheduledFetchMock).toHaveBeenNthCalledWith(2, 'zenn', env)
    expect(runScheduledFetchMock).toHaveBeenNthCalledWith(3, 'hatena', env)
  })

  it('片方のmediaで失敗しても残りのmediaは実行する', async () => {
    runScheduledFetchMock.mockImplementation(async (media: ArticleMedia) => {
      if (media === 'qiita') {
        throw new Error('qiita failed')
      }

      return 2
    })

    const waitUntilCalls: Promise<unknown>[] = []
    const event = { cron: '0 */8 * * *', scheduledTime: 3000 } as ScheduledController
    const env = {
      DB: {} as D1Database,
      DISCORD_WEBHOOK_URL: '',
      LOG_LEVEL: 'silent' as const,
    }

    await worker.scheduled(event, env, {
      waitUntil: (promise: Promise<unknown>) => {
        waitUntilCalls.push(promise)
      },
    } as ExecutionContext)

    expect(waitUntilCalls).toHaveLength(1)
    await Promise.all(waitUntilCalls)
    expect(runScheduledFetchMock).toHaveBeenCalledTimes(ARTICLE_MEDIA.length)
    expect(runScheduledFetchMock).toHaveBeenNthCalledWith(1, 'qiita', env)
    expect(runScheduledFetchMock).toHaveBeenNthCalledWith(2, 'zenn', env)
    expect(runScheduledFetchMock).toHaveBeenNthCalledWith(3, 'hatena', env)
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'cron media fetch failed',
        media: 'qiita',
      }),
      expect.any(Error),
    )
    expect(loggerInfoMock).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'cron job completed',
        successCount: 2,
        failedCount: 1,
        insertedTotal: 4,
      }),
    )
    expect(sendMessageMock).toHaveBeenCalledWith(expect.stringContaining('media: qiita'))
  })

  it('ジョブ全体が予期せず失敗したらDiscordに通知し、Cloudflareにも失敗として伝播させる', async () => {
    const failure = new Error('logger boom')
    loggerInfoMock.mockImplementation((message: { msg?: string }) => {
      if (message?.msg === 'cron job started') {
        throw failure
      }
    })

    const waitUntilCalls: Promise<unknown>[] = []
    const event = { cron: '0 */1 * * *', scheduledTime: 4000 } as ScheduledController
    const env = {
      DB: {} as D1Database,
      DISCORD_WEBHOOK_URL: 'https://example.com/webhook',
      LOG_LEVEL: 'silent' as const,
    }

    await worker.scheduled(event, env, {
      waitUntil: (promise: Promise<unknown>) => {
        waitUntilCalls.push(promise)
      },
    } as ExecutionContext)

    expect(waitUntilCalls).toHaveLength(1)
    await expect(Promise.all(waitUntilCalls)).rejects.toThrow('logger boom')
    expect(runScheduledFetchMock).not.toHaveBeenCalled()
    expect(sendMessageMock).toHaveBeenCalledWith(expect.stringContaining('job failed'))
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({ msg: 'cron job failed' }),
      failure,
    )
  })
})

type D1Database = import('@cloudflare/workers-types').D1Database
