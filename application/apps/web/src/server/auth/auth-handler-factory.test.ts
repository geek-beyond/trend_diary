import { InvalidCredentialsError, UnexpectedAuthError } from '@trend-diary/authentication'
import { ClientError } from '@trend-diary/std/errors'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { err, ok } from 'neverthrow'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import { type AuthHandlerContext, createAuthHandler } from './auth-handler-factory'

// resolveAccount 経路は createAccountUseCase(getRdbClient(...)) を構築するため、実体依存を切る。
// テストでは resolveAccount コールバック自身が結果を返すので、use-case の中身は空で十分。
vi.mock('@trend-diary/datastore/rdb', () => ({ default: vi.fn(() => ({})) }))
vi.mock('@trend-diary/domain/account', () => ({ createAccountUseCase: vi.fn(() => ({})) }))

interface FakeLogger {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

interface BuildContextOptions {
  // oxlint-disable-next-line typescript/no-restricted-types -- 検証済み json を模す任意形状の値を渡すため
  json?: unknown
}

function buildContext(options: BuildContextOptions = {}): { c: Context<Env>; logger: FakeLogger } {
  const logger: FakeLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const req = { valid: (key: 'json') => (key === 'json' ? options.json : undefined) }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  const c = {
    get: (key: string) => (key === CONTEXT_KEY.APP_LOG ? logger : undefined),
    env: { DB: {} },
    req,
    // oxlint-disable-next-line typescript/no-restricted-types -- Hono の c.json を模すモックで、任意の JSON 値を受けるため
    json: (data: unknown, status: number) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    body: (data: BodyInit | null, status: number) => new Response(data, { status }),
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as Context<Env>
  return { c, logger }
}

describe('createAuthHandler', () => {
  describe('正常系', () => {
    it('認証出力を respond に渡して JSON レスポンスを返すこと', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ items: [1, 2] })),
        respond: (c, output) => c.json({ count: output.items.length }, 200),
      })

      const { c } = buildContext()
      const res = await handler(c)

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

      const { c } = buildContext()
      const res = await handler(c)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ displayName: 'テスト太郎' })
    })

    it('logMessage と logPayload を指定すると logger.info(message, payload) を呼ぶこと', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ activeUserId: 7n })),
        logMessage: 'login success',
        logPayload: (output) => ({ activeUserId: output.activeUserId }),
        respond: (c) => c.json({}, 200),
      })

      const { c, logger } = buildContext()
      await handler(c)

      expect(logger.info).toHaveBeenCalledWith('login success', { activeUserId: 7n })
    })

    it('logPayload 未指定なら logger.info(message) を単一引数で呼ぶこと', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok(null)),
        logMessage: 'logout success',
        respond: (c) => c.body(null, 204),
      })

      const { c, logger } = buildContext()
      await handler(c)

      expect(logger.info).toHaveBeenCalledWith('logout success')
    })

    it('respond が 204 を返すとボディなしになること', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok(null)),
        respond: (c) => c.body(null, 204),
      })

      const { c } = buildContext()
      const res = await handler(c)

      expect(res.status).toBe(204)
      expect(await res.text()).toBe('')
    })

    it('beforeAuthenticate は authenticate より前に実行されること', async () => {
      const order: string[] = []
      const handler = createAuthHandler({
        beforeAuthenticate: () => {
          order.push('before')
          return Promise.resolve()
        },
        createClient: () => ({}),
        authenticate: () => {
          order.push('authenticate')
          return Promise.resolve(ok({}))
        },
        respond: (c) => c.json({}, 200),
      })

      const { c } = buildContext()
      await handler(c)

      expect(order).toEqual(['before', 'authenticate'])
    })

    it('検証済み json を ctx.json として各コールバックへ渡すこと', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: (_client, ctx: AuthHandlerContext<{ email: string }>) =>
          Promise.resolve(ok({ email: ctx.json.email })),
        respond: (c, output) => c.json({ email: output.email }, 200),
      })

      const { c } = buildContext({ json: { email: 'user@example.com' } })
      const res = await handler(c)

      expect(await res.json()).toEqual({ email: 'user@example.com' })
    })
  })

  describe('準正常系', () => {
    it('認証ステップの err は toAuthError で変換された HTTPException になること', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(err(new InvalidCredentialsError('invalid'))),
        respond: (c) => c.json({}, 200),
      })

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await handler(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(401)
    })

    it('アカウントステップの err は toAuthError を通さず元のステータスを保つこと', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(ok({ id: 'auth-1' })),
        resolveAccount: () => Promise.resolve(err(new ClientError('User not found', 404))),
        respond: (c) => c.json({}, 200),
      })

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await handler(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(404)
    })

    it('beforeAuthenticate が送出すると authenticate を呼ばず短絡すること', async () => {
      const authenticate = vi.fn(() => Promise.resolve(ok({})))
      const handler = createAuthHandler({
        beforeAuthenticate: () => Promise.reject(new HTTPException(403, { message: 'captcha' })),
        createClient: () => ({}),
        authenticate,
        respond: (c) => c.json({}, 200),
      })

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await handler(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(authenticate).not.toHaveBeenCalled()
    })
  })

  describe('異常系', () => {
    it('対応表に無い AuthError は ServerError 相当の 500 になること', async () => {
      const handler = createAuthHandler({
        createClient: () => ({}),
        authenticate: () => Promise.resolve(err(new UnexpectedAuthError('boom'))),
        respond: (c) => c.json({}, 200),
      })

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await handler(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(500)
    })
  })
})
