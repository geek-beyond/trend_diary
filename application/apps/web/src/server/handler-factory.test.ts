import { ClientError, NotFoundError } from '@trend-diary/common/errors'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { err, ok, type Result } from 'neverthrow'
import type { Env, SessionUser } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import {
  type AuthenticatedRequestContext,
  createAuthenticatedApiHandler,
  createSimpleApiHandler,
  type RequestContext,
} from './handler-factory'

vi.mock('@trend-diary/datastore/rdb', () => ({ default: vi.fn(() => ({})) }))

interface FakeLogger {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

interface BuildContextOptions {
  user?: SessionUser
  // oxlint-disable-next-line typescript/no-restricted-types -- 各ハンドラの検証済みデータを模す任意形状の値を渡すため
  valid?: Record<'param' | 'json' | 'query', unknown>
}

function buildContext(options: BuildContextOptions = {}): {
  c: Context<Env>
  logger: FakeLogger
} {
  const logger: FakeLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  // Hono の HonoRequest は valid メソッドを常に持ち、未検証キーには undefined を返す契約に合わせる
  const req = { valid: (key: 'param' | 'json' | 'query') => options.valid?.[key] }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- テストに必要な最小限の Context を組み立てるため
  const c = {
    get: (key: string) => {
      if (key === CONTEXT_KEY.APP_LOG) return logger
      if (key === CONTEXT_KEY.SESSION_USER) return options.user
      return undefined
    },
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

function baseConfig<TOutput>(result: Result<TOutput, Error>) {
  return {
    createUseCase: () => ({}),
    execute: () => Promise.resolve(result),
    statusCode: 200 as const,
  }
}

describe('createSimpleApiHandler', () => {
  describe('正常系', () => {
    it('成功時は execute の結果を statusCode 付きで返すこと', async () => {
      const output = { id: 1, name: 'diary' }
      const handler = createSimpleApiHandler(baseConfig(ok(output)))

      const { c } = buildContext()
      const res = await handler(c)

      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(output)
    })

    it('transform 指定時は変換後の値を返すこと', async () => {
      const handler = createSimpleApiHandler({
        ...baseConfig(ok({ count: 3 })),
        transform: (output: { count: number }) => ({ message: `count=${output.count}` }),
      })

      const { c } = buildContext()
      const res = await handler(c)

      expect(await res.json()).toEqual({ message: 'count=3' })
    })

    it('statusCode が204のときはボディなしで返すこと', async () => {
      const handler = createSimpleApiHandler({
        ...baseConfig(ok({ ignored: true })),
        statusCode: 204,
      })

      const { c } = buildContext()
      const res = await handler(c)

      expect(res.status).toBe(204)
      expect(await res.text()).toBe('')
    })

    it('logMessage 文字列指定時は logPayload とともに info ログを出すこと', async () => {
      const handler = createSimpleApiHandler({
        ...baseConfig(ok({ total: 10 })),
        logMessage: 'retrieved',
        logPayload: (output: { total: number }) => ({ total: output.total }),
      })

      const { c, logger } = buildContext()
      await handler(c)

      expect(logger.info).toHaveBeenCalledWith({ msg: 'retrieved', total: 10 })
    })

    it('logMessage 関数指定時は output と context からメッセージを組み立てること', async () => {
      const handler = createSimpleApiHandler({
        ...baseConfig(ok({ total: 5 })),
        logMessage: (output: { total: number }) => `total is ${output.total}`,
      })

      const { c, logger } = buildContext()
      await handler(c)

      // logPayload 未指定時は空ペイロードとなる
      expect(logger.info).toHaveBeenCalledWith({ msg: 'total is 5' })
    })

    it('バリデーション済みデータを execute に渡すこと', async () => {
      const valid = { param: { id: 1 }, json: { body: 'x' }, query: { page: 2 } }
      const execute = vi.fn(
        (
          _useCase: object,
          _context: RequestContext,
        ): Promise<Result<Record<string, never>, Error>> => Promise.resolve(ok({})),
      )
      const handler = createSimpleApiHandler({
        createUseCase: () => ({}),
        execute,
        statusCode: 200,
      })

      const { c } = buildContext({ valid })
      await handler(c)

      const context = execute.mock.calls[0]![1]
      expect(context.param).toEqual(valid.param)
      expect(context.json).toEqual(valid.json)
      expect(context.query).toEqual(valid.query)
      expect(context.user).toBeUndefined()
    })
  })

  describe('準正常系', () => {
    it('execute がエラーを返すと handleError で変換した HTTPException を投げること', async () => {
      const handler = createSimpleApiHandler(baseConfig(err(new NotFoundError('not found'))))

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await handler(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(404)
    })

    it('ClientError のステータスコードが HTTPException に引き継がれること', async () => {
      const handler = createSimpleApiHandler(baseConfig(err(new ClientError('bad request', 400))))

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await handler(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
      expect((thrown as HTTPException).status).toBe(400)
    })
  })
})

describe('createAuthenticatedApiHandler', () => {
  const sessionUser: SessionUser = {
    activeUserId: 42n,
    displayName: 'テスト太郎',
    email: 'user@example.com',
  }

  describe('正常系', () => {
    it('認証済みユーザーを context.user に渡して実行すること', async () => {
      const execute = vi.fn(
        (
          _useCase: object,
          _context: AuthenticatedRequestContext,
        ): Promise<Result<{ ok: boolean }, Error>> => Promise.resolve(ok({ ok: true })),
      )
      const handler = createAuthenticatedApiHandler({
        createUseCase: () => ({}),
        execute,
        statusCode: 200,
      })

      const { c } = buildContext({ user: sessionUser })
      const res = await handler(c)

      expect(res.status).toBe(200)
      expect(execute.mock.calls[0]![1].user).toEqual(sessionUser)
    })
  })

  describe('異常系', () => {
    // authenticator が先行適用される契約のため、未設定は 401 に偽装せず契約違反として送出する
    it('SESSION_USER が未設定なら契約違反エラーを投げること', async () => {
      const handler = createAuthenticatedApiHandler(baseConfig(ok({})))

      const { c } = buildContext()

      await expect(handler(c)).rejects.toThrow(CONTEXT_KEY.SESSION_USER)
    })
  })
})
