import {
  InvalidCredentialsError,
  PasskeyRegistrationError,
  UnexpectedAuthError,
} from '@trend-diary/authentication'
import Logger from '@trend-diary/logger'
import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { err, ok } from 'neverthrow'
import { z } from 'zod'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator from '@/middleware/zod-validator'
import mountAuthHandler from '@/test/helper/mount-auth-handler'
import { createClientHandler } from './client-handler'
import type { AuthHandlerContext } from './context'

describe('createClientHandler', () => {
  describe('正常系', () => {
    it('認証出力を respond に渡して JSON レスポンスを返すこと', async () => {
      const handler = createClientHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ items: [1, 2] })),
        respond: (c, output) => c.json({ count: output.items.length }, 200),
      })

      const res = await mountAuthHandler(handler)()

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ count: 2 })
    })

    it('log コールバックに認証出力を渡して呼ぶこと', async () => {
      const log = vi.fn()
      const handler = createClientHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ id: 'auth-1' })),
        log,
        respond: (c) => c.json({}, 200),
      })

      await mountAuthHandler(handler)()

      expect(log).toHaveBeenCalledTimes(1)
      expect(log.mock.calls[0]![0]).toEqual({ id: 'auth-1' })
    })

    it('respond が 204 を返すとボディなしになること(log 未指定)', async () => {
      const handler = createClientHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok(null)),
        respond: (c) => c.body(null, 204),
      })

      const res = await mountAuthHandler(handler)()

      expect(res.status).toBe(204)
      expect(await res.text()).toBe('')
    })

    it('検証済み json を ctx.json として respond まで通すこと', async () => {
      const handler = createClientHandler({
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
        const handler = createClientHandler({
          createClient: () => ({}),
          authenticate: () => Promise.resolve(err(error)),
          respond: (c) => c.json({}, 200),
        })

        const res = await mountAuthHandler(handler)()

        expect(res.status).toBe(status)
      },
    )

    it('authenticate が送出した例外(captcha 等)はそのまま応答へ伝播すること', async () => {
      const handler = createClientHandler({
        createClient: () => ({}),
        authenticate: () => Promise.reject(new HTTPException(403, { message: 'captcha' })),
        respond: (c) => c.json({}, 200),
      })

      const res = await mountAuthHandler(handler)()

      expect(res.status).toBe(403)
    })
  })

  describe('異常系', () => {
    it('対応表に無い AuthError は ServerError 相当の 500 になること', async () => {
      const handler = createClientHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(err(new UnexpectedAuthError('boom'))),
        respond: (c) => c.json({}, 200),
      })

      const res = await mountAuthHandler(handler)()

      expect(res.status).toBe(500)
    })
  })
})
