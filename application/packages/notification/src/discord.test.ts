import type { LoggerType } from '@trend-diary/common/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiscordNotifier, DiscordWebhookClient } from './discord'

// fetchをモック
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// Logger注入の検証用モック
const createMockLogger = () =>
  ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    with: vi.fn(),
  }) as unknown as LoggerType

// リトライ待機を待たずにテストするため、backoffの基準遅延を0にする
const noDelay = { baseDelayMs: 0 }

describe('DiscordWebhookClient', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('send', () => {
    it.each([
      { label: '空文字', url: '' },
      { label: 'undefined', url: undefined },
    ])('Webhook URLが$labelの場合は何もしない', async ({ url }) => {
      const client = new DiscordWebhookClient(url)

      await client.send({ content: 'test' })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('Webhook URLが未設定の場合は警告ログを記録する', async () => {
      const logger = createMockLogger()
      const client = new DiscordWebhookClient('', { logger })

      await client.send({ content: 'test' })

      expect(logger.warn).toHaveBeenCalledTimes(1)
    })

    it('指定したペイロードをDiscord Webhookに送信する', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/test'
      const client = new DiscordWebhookClient(webhookUrl)
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })

      const payload = {
        content: null,
        embeds: [
          {
            title: 'title',
            color: 1,
            fields: [{ name: 'n', value: 'v', inline: false }],
            timestamp: '2026-01-01T00:00:00.000Z',
          },
        ],
      }
      await client.send(payload)

      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toEqual(payload)
    })

    it('送信が成功した場合はリトライしない', async () => {
      const client = new DiscordWebhookClient('https://discord.com/api/webhooks/test', noDelay)
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })

      await client.send({ content: 'test' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('ネットワークエラー時はexponential backoffでリトライする', async () => {
      const logger = createMockLogger()
      const client = new DiscordWebhookClient('https://discord.com/api/webhooks/test', {
        ...noDelay,
        logger,
      })
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ ok: true, status: 204 })

      await client.send({ content: 'test' })

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it.each([
      { label: '429（レートリミット）', status: 429 },
      { label: '5xx', status: 500 },
    ])('一時的な失敗（$label）はリトライして成功する', async ({ status }) => {
      const logger = createMockLogger()
      const client = new DiscordWebhookClient('https://discord.com/api/webhooks/test', {
        ...noDelay,
        logger,
      })
      mockFetch
        .mockResolvedValueOnce({ ok: false, status })
        .mockResolvedValueOnce({ ok: true, status: 204 })

      await client.send({ content: 'test' })

      expect(mockFetch).toHaveBeenCalledTimes(2)
      expect(logger.error).not.toHaveBeenCalled()
    })

    it.each([
      { label: '401（Webhook失効）は即時打ち切り', status: 401, expectedCalls: 1 },
      { label: '404（Webhook削除）は即時打ち切り', status: 404, expectedCalls: 1 },
      { label: '5xxが継続し最大リトライ到達', status: 500, expectedCalls: 3 },
    ])('失敗が続く場合（$label）はエラーログを記録する', async ({ status, expectedCalls }) => {
      const logger = createMockLogger()
      const client = new DiscordWebhookClient('https://discord.com/api/webhooks/test', {
        ...noDelay,
        logger,
      })
      mockFetch.mockResolvedValue({ ok: false, status })

      await client.send({ content: 'test' })

      expect(mockFetch).toHaveBeenCalledTimes(expectedCalls)
      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('ハング防止のためAbortControllerのsignalを付与して送信する', async () => {
      const client = new DiscordWebhookClient('https://discord.com/api/webhooks/test')
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })

      await client.send({ content: 'test' })

      expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
    })

    it('送信が失敗してもエラーを投げない', async () => {
      const client = new DiscordWebhookClient('https://discord.com/api/webhooks/test', noDelay)
      mockFetch.mockRejectedValue(new Error('Network error'))

      await expect(client.send({ content: 'test' })).resolves.not.toThrow()
    })
  })

  describe('sendMessage', () => {
    it('content形式の単純メッセージを送信する', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/test'
      const client = new DiscordWebhookClient(webhookUrl)
      mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })

      await client.sendMessage('hello')

      const body = JSON.parse(mockFetch.mock.calls[0][1].body)
      expect(body).toEqual({ content: 'hello' })
    })

    it('Webhook URLが設定されていない場合は何もしない', async () => {
      const client = new DiscordWebhookClient('')

      await client.sendMessage('hello')

      expect(mockFetch).not.toHaveBeenCalled()
    })
  })
})

describe('DiscordNotifier', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('error', () => {
    it('Webhook URLが設定されていない場合は何もしない', async () => {
      const notifier = new DiscordNotifier('')

      await notifier.error(new Error('Test error'), {
        url: '/test',
        method: 'GET',
        userAgent: 'test-agent',
      })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('5xxエラーの場合、Discord Webhookにメッセージを送信する', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/test'
      const notifier = new DiscordNotifier(webhookUrl)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const error = new Error('Internal Server Error')
      error.stack = 'Error: Internal Server Error\n    at test.js:1:1'

      await notifier.error(error, {
        url: '/api/test',
        method: 'POST',
        userAgent: 'Mozilla/5.0',
      })

      expect(mockFetch).toHaveBeenCalledWith(
        webhookUrl,
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        }),
      )

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)

      expect(body).toEqual({
        content: null,
        embeds: [
          {
            title: '🚨 5xx Server Error Occurred',
            color: 15158332,
            fields: [
              { name: 'Error Message', value: '```\nInternal Server Error\n```', inline: false },
              {
                name: 'Request Info',
                value: '```\nMethod: POST\nURL: /api/test\nUser-Agent: Mozilla/5.0\n```',
                inline: false,
              },
              {
                name: 'Stack Trace',
                value: '```\nError: Internal Server Error\n    at test.js:1:1\n```',
                inline: false,
              },
            ],
            timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
          },
        ],
      })
    })

    it('Discord Webhook送信が失敗してもエラーを投げない', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/test'
      const notifier = new DiscordNotifier(webhookUrl, noDelay)

      mockFetch.mockRejectedValue(new Error('Network error'))

      const error = new Error('Internal Server Error')

      await expect(
        notifier.error(error, {
          url: '/api/test',
          method: 'GET',
          userAgent: 'test-agent',
        }),
      ).resolves.not.toThrow()
    })

    it('注入したLoggerに通知失敗を記録する', async () => {
      const logger = createMockLogger()
      const notifier = new DiscordNotifier('https://discord.com/api/webhooks/test', {
        ...noDelay,
        logger,
      })
      mockFetch.mockResolvedValue({ ok: false, status: 500 })

      await notifier.error(new Error('Internal Server Error'), {
        url: '/api/test',
        method: 'GET',
        userAgent: 'test-agent',
      })

      expect(logger.error).toHaveBeenCalledTimes(1)
    })

    it('スタックトレースが長い場合は適切に切り詰める', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/test'
      const notifier = new DiscordNotifier(webhookUrl)

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204,
      })

      const error = new Error('Test error')
      // 1000文字以上のスタックトレースを作成
      error.stack = `Error: Test error\n${'a'.repeat(1000)}`

      await notifier.error(error, {
        url: '/test',
        method: 'GET',
        userAgent: 'test',
      })

      const callArgs = mockFetch.mock.calls[0]
      const body = JSON.parse(callArgs[1].body)
      const stackTraceField = body.embeds[0].fields.find(
        (field: { name: string; value: string }) => field.name === 'Stack Trace',
      )

      // Discordの制限（1024文字）以下になっているか確認
      expect(stackTraceField.value.length).toBeLessThanOrEqual(1024)
      expect(stackTraceField.value).toContain('...(truncated)')
    })
  })
})
