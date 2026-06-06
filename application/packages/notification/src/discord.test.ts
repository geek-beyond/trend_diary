import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiscordNotifier, DiscordWebhookClient } from './discord'

// fetchをモック
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('DiscordWebhookClient', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('send', () => {
    it('Webhook URLが設定されていない場合は何もしない', async () => {
      const client = new DiscordWebhookClient('')

      await client.send({ content: 'test' })

      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('Webhook URLが未指定（undefined）の場合は何もしない', async () => {
      const client = new DiscordWebhookClient()

      await client.send({ content: 'test' })

      expect(mockFetch).not.toHaveBeenCalled()
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

    it('送信が失敗してもエラーを投げない', async () => {
      const client = new DiscordWebhookClient('https://discord.com/api/webhooks/test')
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

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

      expect(body.content).toBeNull()
      expect(body.embeds).toHaveLength(1)
      expect(body.embeds[0].title).toBe('🚨 5xx Server Error Occurred')
      expect(body.embeds[0].color).toBe(15158332)
      expect(body.embeds[0].fields).toHaveLength(3)
      expect(body.embeds[0].fields[0].name).toBe('Error Message')
      expect(body.embeds[0].fields[0].value).toBe('```\nInternal Server Error\n```')
      expect(body.embeds[0].fields[1].name).toBe('Request Info')
      expect(body.embeds[0].fields[1].value).toBe(
        '```\nMethod: POST\nURL: /api/test\nUser-Agent: Mozilla/5.0\n```',
      )
      expect(body.embeds[0].fields[2].name).toBe('Stack Trace')
      expect(body.embeds[0].fields[2].value).toBe(
        '```\nError: Internal Server Error\n    at test.js:1:1\n```',
      )
      expect(body.embeds[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
    })

    it('Discord Webhook送信が失敗してもエラーを投げない', async () => {
      const webhookUrl = 'https://discord.com/api/webhooks/test'
      const notifier = new DiscordNotifier(webhookUrl)

      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      const error = new Error('Internal Server Error')

      await expect(
        notifier.error(error, {
          url: '/api/test',
          method: 'GET',
          userAgent: 'test-agent',
        }),
      ).resolves.not.toThrow()
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
