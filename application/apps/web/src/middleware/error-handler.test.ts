import { AssertionError } from '@trend-diary/std/contract'
import { ClientError, ExternalServiceError, ServerError } from '@trend-diary/std/errors'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '@/env'
import CONTEXT_KEY from './context'
import errorHandler from './error-handler'

const { discordError } = vi.hoisted(() => ({ discordError: vi.fn() }))
vi.mock('@trend-diary/notification', () => ({
  DiscordNotifier: class {
    error = discordError
  },
}))

interface FakeLogger {
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

function buildContext(logger?: FakeLogger): Context<Env> {
  // oxlint-disable-next-line typescript/no-restricted-types -- Hono の変数ストアを模す、任意値を保持する Map のため
  const store = new Map<string, unknown>()
  // APP_LOG 未設定（契約違反）のケースを再現するため、logger 省略時はセットしない
  if (logger) store.set(CONTEXT_KEY.APP_LOG, logger)
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  return {
    get: (key: string) => store.get(key),
    env: { DISCORD_WEBHOOK_URL: 'https://discord.test/webhook', LOG_LEVEL: 'silent' },
    req: {
      url: 'https://example.com/api/x',
      method: 'GET',
      path: '/api/x',
      header: (name: string) => (name === 'User-Agent' ? 'test-agent' : undefined),
    },
    // oxlint-disable-next-line typescript/no-restricted-types -- Hono の c.json を模すモックで、任意の JSON 値を受けるため
    json: (data: unknown, init: ResponseInit) => new Response(JSON.stringify(data), init),
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as Context<Env>
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    discordError.mockResolvedValue(undefined)
  })

  describe('準正常系', () => {
    it('4xx の HTTPException は warn ログを出し Discord 通知せずに返すこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const res = await errorHandler(
        new HTTPException(404, { message: 'not found' }),
        buildContext(logger),
      )

      expect(res.status).toBe(404)
      expect(await res.json()).toEqual({ message: 'not found' })
      expect(logger.warn).toHaveBeenCalledOnce()
      expect(logger.error).not.toHaveBeenCalled()
      // 4xx はサーバー障害ではないため通知しない
      expect(discordError).not.toHaveBeenCalled()
    })

    it('5xx の HTTPException は error ログと Discord 通知を行うこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const res = await errorHandler(
        new HTTPException(503, { message: 'unavailable' }),
        buildContext(logger),
      )

      expect(res.status).toBe(503)
      expect(logger.error).toHaveBeenCalledOnce()
      expect(discordError).toHaveBeenCalledOnce()
    })

    it('ClientError は statusCode の 4xx で warn ログを出し Discord 通知せずに返すこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const res = await errorHandler(new ClientError('invalid query', 422), buildContext(logger))

      expect(res.status).toBe(422)
      expect(await res.json()).toEqual({ message: 'invalid query' })
      expect(logger.warn).toHaveBeenCalledOnce()
      expect(logger.error).not.toHaveBeenCalled()
      expect(discordError).not.toHaveBeenCalled()
    })

    it('ServerError は statusCode の 5xx で error ログと Discord 通知を行うこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const res = await errorHandler(
        new ServerError(new Error('db down'), 503),
        buildContext(logger),
      )

      expect(res.status).toBe(503)
      expect(await res.json()).toEqual({ message: 'db down' })
      expect(logger.error).toHaveBeenCalledOnce()
      expect(discordError).toHaveBeenCalledOnce()
    })

    it('ExternalServiceError は詳細を構造化ログに残し Discord 通知して500で返すこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const externalError = new ExternalServiceError(
        'compensation failed',
        new ServerError('original failure'),
        new ServerError('service failure'),
        { userId: 'auth-user-1' },
      )

      const res = await errorHandler(externalError, buildContext(logger))

      expect(res.status).toBe(500)
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'external service error',
          context: { userId: 'auth-user-1' },
        }),
        externalError,
      )
      expect(discordError).toHaveBeenCalledOnce()
    })

    it('HTTPException 以外は500と Discord 通知で返すこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const res = await errorHandler(new Error('boom'), buildContext(logger))

      expect(res.status).toBe(500)
      expect(logger.error).toHaveBeenCalledWith('Unhandled error', expect.any(Error))
      expect(discordError).toHaveBeenCalledOnce()
    })

    it('契約違反（AssertionError）は contract violation としてログに残し500と Discord 通知で返すこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const res = await errorHandler(new AssertionError('invariant broken'), buildContext(logger))

      expect(res.status).toBe(500)
      expect(logger.error).toHaveBeenCalledWith(
        expect.objectContaining({ msg: 'contract violation' }),
        expect.any(AssertionError),
      )
      expect(discordError).toHaveBeenCalledOnce()
    })
  })

  describe('異常系', () => {
    // APP_LOG は request-logger が設定する契約。未設定での起動は契約違反として送出されることを担保する
    it('APP_LOG 未設定で呼び出された場合はエラーを送出すること', async () => {
      await expect(errorHandler(new Error('boom'), buildContext())).rejects.toThrow('appLog')
    })
  })
})
