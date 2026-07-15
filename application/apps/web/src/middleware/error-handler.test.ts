import { InvalidCredentialsError, UnexpectedAuthError } from '@trend-diary/authentication'
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

    it('HTTPException 以外は500と Discord 通知で返すこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const res = await errorHandler(new Error('boom'), buildContext(logger))

      expect(res.status).toBe(500)
      expect(logger.error).toHaveBeenCalledWith('Unhandled error', expect.any(Error))
      expect(discordError).toHaveBeenCalledOnce()
    })

    it('認証パッケージのカスタムエラーは対応するステータスへ写像しメッセージを保つこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const res = await errorHandler(
        new InvalidCredentialsError('invalid login credentials'),
        buildContext(logger),
      )

      expect(res.status).toBe(401)
      expect(await res.json()).toEqual({ message: 'invalid login credentials' })
      expect(logger.warn).toHaveBeenCalledOnce()
      expect(discordError).not.toHaveBeenCalled()
    })

    it('マップに無い認証エラー(UnexpectedAuthError)は500に倒すこと', async () => {
      const logger: FakeLogger = { warn: vi.fn(), error: vi.fn() }
      const res = await errorHandler(new UnexpectedAuthError('boom'), buildContext(logger))

      expect(res.status).toBe(500)
      expect(logger.error).toHaveBeenCalledOnce()
      expect(discordError).toHaveBeenCalledOnce()
    })
  })

  describe('異常系', () => {
    // request-logger 確立前に発生したエラーでも記録・通知できることを担保する
    let consoleError: ReturnType<typeof vi.spyOn>
    let consoleWarn: ReturnType<typeof vi.spyOn>

    beforeEach(() => {
      consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    afterEach(() => {
      consoleError.mockRestore()
      consoleWarn.mockRestore()
    })

    it('logger 未設定の5xxは console.error にフォールバックすること', async () => {
      const res = await errorHandler(new HTTPException(500, { message: 'oops' }), buildContext())

      expect(res.status).toBe(500)
      expect(consoleError).toHaveBeenCalled()
      expect(discordError).toHaveBeenCalledOnce()
    })

    it('logger 未設定の4xxは console.warn にフォールバックすること', async () => {
      const res = await errorHandler(new HTTPException(400, { message: 'bad' }), buildContext())

      expect(res.status).toBe(400)
      expect(consoleWarn).toHaveBeenCalled()
      expect(discordError).not.toHaveBeenCalled()
    })

    it('logger 未設定の想定外エラーは console.error にフォールバックすること', async () => {
      const res = await errorHandler(new Error('boom'), buildContext())

      expect(res.status).toBe(500)
      expect(consoleError).toHaveBeenCalledWith('Unhandled error', expect.any(Error))
      expect(discordError).toHaveBeenCalledOnce()
    })
  })
})
