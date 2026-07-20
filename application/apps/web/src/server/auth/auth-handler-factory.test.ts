import {
  InvalidCredentialsError,
  PasskeyRegistrationError,
  UnexpectedAuthError,
} from '@trend-diary/authentication'
import Logger from '@trend-diary/logger'
import { ClientError } from '@trend-diary/std/errors'
import { type Context, Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { err, ok } from 'neverthrow'
import { z } from 'zod'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator from '@/middleware/zod-validator'
import { type AuthHandlerContext, createAuthHandler } from './auth-handler-factory'

// resolveAccount 経路は createAccountUseCase(getRdbClient(...)) を構築するため実体依存を切る。
// resolveAccount コールバック自身が結果を返すので use-case の中身は空で十分。
vi.mock('@trend-diary/datastore/rdb', () => ({ default: vi.fn(() => ({})) }))
vi.mock('@trend-diary/domain/account', () => ({ createAccountUseCase: vi.fn(() => ({})) }))

// 手動 Context モック(型アサーション)を避け、実 Hono へルーティングして app.request で本番同等の
// 経路を通す。ロガーは実 Logger を spy し、二重アサーションを避ける(handle-error.test.ts と同方針)。
function mountHandler(handler: (c: Context<Env>) => Promise<Response>) {
  const logger = new Logger('silent')
  const info = vi.spyOn(logger, 'info').mockImplementation(() => {})
  const app = new Hono<Env>()
  app.use('*', async (c, next) => {
    c.set(CONTEXT_KEY.APP_LOG, logger)
    await next()
  })
  app.post('/auth', handler)
  // env.DB は getRdbClient のモックが受けるため空で良い
  return { request: () => app.request('/auth', { method: 'POST' }, { DB: {} }), info }
}

describe('createAuthHandler', () => {
  describe('正常系', () => {
    it('認証出力を respond に渡して JSON レスポンスを返すこと', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ items: [1, 2] })),
        respond: (c, output) => c.json({ count: output.items.length }, 200),
      })

      const res = await mountHandler(handler).request()

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ count: 2 })
    })

    it('resolveAccount 指定時は認証出力ではなくアカウント出力を respond に渡すこと', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ id: 'auth-1' })),
        resolveAccount: (_useCase, user) =>
          Promise.resolve(ok({ authenticationId: user.id, displayName: 'テスト太郎' })),
        respond: (c, account) => c.json({ displayName: account.displayName }, 200),
      })

      const res = await mountHandler(handler).request()

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ displayName: 'テスト太郎' })
    })

    it('log コールバックに最終出力を渡して呼ぶこと', async () => {
      const log = vi.fn()
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ id: 'auth-1' })),
        resolveAccount: () => Promise.resolve(ok({ activeUserId: 7n })),
        log,
        respond: (c) => c.json({}, 200),
      })

      await mountHandler(handler).request()

      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]![0]).toEqual({ activeUserId: 7n })
    })

    it('respond が 204 を返すとボディなしになること', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok(null)),
        respond: (c) => c.body(null, 204),
      })

      const res = await mountHandler(handler).request()

      expect(res.status).toBe(204)
      expect(await res.text()).toBe('')
    })

    it('検証済み json を ctx.json として respond まで通すこと', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: (_client, ctx: AuthHandlerContext<{ email: string }>) =>
          Promise.resolve(ok({ email: ctx.json.email })),
        respond: (c, output) => c.json({ email: output.email }, 200),
      })

      const logger = new Logger('silent')
      const app = new Hono<Env>()
      app.use('*', async (c, next) => {
        c.set(CONTEXT_KEY.APP_LOG, logger)
        await next()
      })
      app.post('/auth', zodValidator('json', z.object({ email: z.string().email() })), handler)

      const res = await app.request(
        '/auth',
        {
          method: 'POST',
          body: JSON.stringify({ email: 'user@example.com' }),
          headers: { 'Content-Type': 'application/json' },
        },
        { DB: {} },
      )

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ email: 'user@example.com' })
    })
  })

  describe('準正常系', () => {
    it.each([
      { name: '認証情報不正', error: new InvalidCredentialsError('invalid'), status: 401 },
      { name: 'passkey登録失敗', error: new PasskeyRegistrationError('register'), status: 400 },
    ])(
      '認証ステップの $name は toAuthError で $status に変換されること',
      async ({ error, status }) => {
        const handler = createAuthHandler({
          createClient: () => ({}),
          authenticate: () => Promise.resolve(err(error)),
          respond: (c) => c.json({}, 200),
        })

        const res = await mountHandler(handler).request()

        expect(res.status).toBe(status)
      },
    )

    it('アカウントステップの err は toAuthError を通さず元のステータスを保つこと', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ id: 'auth-1' })),
        resolveAccount: () => Promise.resolve(err(new ClientError('User not found', 404))),
        respond: (c) => c.json({}, 200),
      })

      const res = await mountHandler(handler).request()

      expect(res.status).toBe(404)
    })

    it('authenticate が送出した例外(captcha 等)はそのまま応答へ伝播すること', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.reject(new HTTPException(403, { message: 'captcha' })),
        respond: (c) => c.json({}, 200),
      })

      const res = await mountHandler(handler).request()

      expect(res.status).toBe(403)
    })
  })

  describe('異常系', () => {
    it('対応表に無い AuthError は ServerError 相当の 500 になること', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(err(new UnexpectedAuthError('boom'))),
        respond: (c) => c.json({}, 200),
      })

      const res = await mountHandler(handler).request()

      expect(res.status).toBe(500)
    })
  })
})
