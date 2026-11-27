import type { LoggerType } from '@trend-diary/logger'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DiscordNotifier, DiscordWebhookClient } from './discord'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const createMockLogger = () =>
  // oxlint-disable-next-line typescript/consistent-type-assertions -- Loggerはprivateフィールドを持ち構造的に代入できないため、テスト用モックの注入には二重アサーションが避けられないため
  ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    with: vi.fn(),
    // oxlint-disable-next-line typescript/no-restricted-types -- Loggerはprivateフィールドを持ち構造的に代入できず、二重アサーションで unknown を経由するほかないためです
  }) as unknown as LoggerType

// リトライ待機を待たずにテストするため
const noDelay = { baseDelayMs: 0 }

const webhookUrl = 'https://discord.com/api/webhooks/test'

describe('DiscordWebhookClient', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('send', () => {
    describe('正常系', () => {
      it('指定したペイロードをsignal付きで1回だけ送信する', async () => {
        const client = new DiscordWebhookClient(webhookUrl, createMockLogger())
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
        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
        const body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body).toEqual(payload)
      })
    })

    describe('準正常系', () => {
      // 通知が使えない環境でもアプリ本体は止めない意図的な縮退。無音にはせず警告ログで検知可能にする
      it('Webhook URLが空文字の場合は送信せず警告ログを記録する', async () => {
        const logger = createMockLogger()
        const client = new DiscordWebhookClient('', logger)

        await client.send({ content: 'test' })

        expect(mockFetch).not.toHaveBeenCalled()
        expect(logger.warn).toHaveBeenCalledTimes(1)
      })

      // 型上は string 必須だが、Workers 実行時は secret 未設定で undefined が渡り得るため担保する
      it('Webhook URLが実行時にundefinedの場合も送信せず警告ログを記録する', async () => {
        const logger = createMockLogger()
        // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- 型上あり得ないが実行時に起こり得る未設定を再現するため。undefined は string と重ならず二重アサーションが避けられない
        const client = new DiscordWebhookClient(undefined as unknown as string, logger)

        await client.send({ content: 'test' })

        expect(mockFetch).not.toHaveBeenCalled()
        expect(logger.warn).toHaveBeenCalledTimes(1)
      })

      it.each([
        { label: '429（レートリミット）', status: 429 },
        { label: '5xx', status: 500 },
      ])('一時的な失敗（$label）はリトライして成功する', async ({ status }) => {
        const logger = createMockLogger()
        const client = new DiscordWebhookClient(webhookUrl, logger, noDelay)
        mockFetch
          .mockResolvedValueOnce({ ok: false, status })
          .mockResolvedValueOnce({ ok: true, status: 204 })

        await client.send({ content: 'test' })

        expect(mockFetch).toHaveBeenCalledTimes(2)
        expect(logger.error).not.toHaveBeenCalled()
      })

      it('ネットワークエラー時は100ms・200msのbackoffでリトライする', async () => {
        vi.useFakeTimers()
        try {
          const logger = createMockLogger()
          const client = new DiscordWebhookClient(webhookUrl, logger, { baseDelayMs: 100 })
          mockFetch
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'))
            .mockResolvedValueOnce({ ok: true, status: 204 })
          const sending = client.send({ content: 'test' })
          await vi.advanceTimersByTimeAsync(0)
          expect(mockFetch).toHaveBeenCalledTimes(1)
          await vi.advanceTimersByTimeAsync(99)
          expect(mockFetch).toHaveBeenCalledTimes(1)
          await vi.advanceTimersByTimeAsync(1)
          expect(mockFetch).toHaveBeenCalledTimes(2)
          await vi.advanceTimersByTimeAsync(199)
          expect(mockFetch).toHaveBeenCalledTimes(2)
          await vi.advanceTimersByTimeAsync(1)
          await sending
          expect(mockFetch).toHaveBeenCalledTimes(3)
          expect(logger.error).not.toHaveBeenCalled()
        } finally {
          vi.useRealTimers()
        }
      })
    })

    describe('異常系', () => {
      it.each([
        { label: '401（Webhook失効）は即時打ち切り', status: 401, expectedCalls: 1 },
        { label: '404（Webhook削除）は即時打ち切り', status: 404, expectedCalls: 1 },
        { label: '5xxが継続し最大リトライ到達', status: 500, expectedCalls: 3 },
      ])('失敗が続く場合（$label）はエラーログを記録する', async ({ status, expectedCalls }) => {
        const logger = createMockLogger()
        const client = new DiscordWebhookClient(webhookUrl, logger, noDelay)
        mockFetch.mockResolvedValue({ ok: false, status })

        await client.send({ content: 'test' })

        expect(mockFetch).toHaveBeenCalledTimes(expectedCalls)
        expect(logger.error).toHaveBeenCalledTimes(1)
        expect(logger.error).toHaveBeenCalledWith(
          expect.objectContaining({ attempts: expectedCalls }),
          expect.objectContaining({ message: `Discord responded with status ${status}` }),
        )
      })

      it('ネットワークエラーは最終試行後に待機せず元の原因を記録し、呼び出し元に投げない', async () => {
        vi.useFakeTimers()
        try {
          const logger = createMockLogger()
          const cause = new Error('Network error')
          const client = new DiscordWebhookClient(webhookUrl, logger, { baseDelayMs: 100 })
          mockFetch.mockRejectedValue(cause)

          const sending = client.send({ content: 'test' })
          await vi.advanceTimersByTimeAsync(300)

          expect(mockFetch).toHaveBeenCalledTimes(3)
          expect(logger.error).toHaveBeenCalledWith(
            { msg: 'Failed to send notification to Discord', attempts: 3 },
            cause,
          )
          expect(vi.mocked(logger.error).mock.calls[0][1]).toBe(cause)
          await expect(sending).resolves.toBeUndefined()
        } finally {
          vi.useRealTimers()
        }
      })
    })
  })

  describe('sendMessage', () => {
    describe('正常系', () => {
      it('content形式の単純メッセージを送信する', async () => {
        const client = new DiscordWebhookClient(webhookUrl, createMockLogger())
        mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })

        await client.sendMessage('hello')

        expect(mockFetch).toHaveBeenCalledTimes(1)
        expect(mockFetch.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal)
        const body = JSON.parse(mockFetch.mock.calls[0][1].body)
        expect(body).toEqual({ content: 'hello' })
      })
    })

    describe('準正常系', () => {
      it('Webhook URLが設定されていない場合は何もしない', async () => {
        const client = new DiscordWebhookClient('', createMockLogger())

        await client.sendMessage('hello')

        expect(mockFetch).not.toHaveBeenCalled()
      })
    })
  })
})

describe('DiscordNotifier', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('error', () => {
    describe('正常系', () => {
      it('5xxエラーの場合、Discord Webhookにメッセージを送信する', async () => {
        const notifier = new DiscordNotifier(webhookUrl, createMockLogger())

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
    })

    describe('準正常系', () => {
      it('Webhook URLが設定されていない場合は何もしない', async () => {
        const notifier = new DiscordNotifier('', createMockLogger())

        await notifier.error(new Error('Test error'), {
          url: '/test',
          method: 'GET',
          userAgent: 'test-agent',
        })

        expect(mockFetch).not.toHaveBeenCalled()
      })

      it.each([
        { length: 1016, expected: `\`\`\`\n${'a'.repeat(1016)}\n\`\`\`` },
        { length: 1017, expected: `\`\`\`\n${'a'.repeat(1002)}...(truncated)\n\`\`\`` },
      ])(
        'スタックが$length 文字なら、コードブロックを含め1024文字以内で保持する',
        async ({ length, expected }) => {
          const notifier = new DiscordNotifier(webhookUrl, createMockLogger())
          mockFetch.mockResolvedValueOnce({ ok: true, status: 204 })
          const error = new Error('Test error')
          error.stack = 'a'.repeat(length)
          await notifier.error(error, { url: '/test', method: 'GET', userAgent: 'test' })
          const body = JSON.parse(mockFetch.mock.calls[0][1].body)
          const stackTraceField = body.embeds[0].fields.find(
            (field: { name: string; value: string }) => field.name === 'Stack Trace',
          )
          expect(stackTraceField.value).toBe(expected)
        },
      )
    })

    describe('異常系', () => {
      it('Discord Webhook送信が失敗してもエラーを投げない', async () => {
        const notifier = new DiscordNotifier(webhookUrl, createMockLogger(), noDelay)

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
        const notifier = new DiscordNotifier(webhookUrl, logger, noDelay)
        mockFetch.mockResolvedValue({ ok: false, status: 500 })

        await notifier.error(new Error('Internal Server Error'), {
          url: '/api/test',
          method: 'GET',
          userAgent: 'test-agent',
        })

        expect(logger.error).toHaveBeenCalledTimes(1)
      })
    })
  })
})
