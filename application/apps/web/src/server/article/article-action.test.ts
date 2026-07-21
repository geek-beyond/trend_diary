import { ClientError, NotFoundError } from '@trend-diary/std/errors'
import { HTTPException } from 'hono/http-exception'
import { err, ok, type Result } from 'neverthrow'
import type { SessionUser } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import { type ArticleActionContext, createArticleActionHandler } from './article-action'

vi.mock('@trend-diary/datastore/rdb', () => ({ default: vi.fn(() => ({})) }))

interface FakeLogger {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

const ARTICLE_ID = 42n

interface BuildContextOptions {
  user?: SessionUser
}

function buildContext(options: BuildContextOptions = {}): {
  c: ArticleActionContext
  logger: FakeLogger
} {
  const logger: FakeLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストで、構造的に代入できず二重アサーションが避けられないため
  const c = {
    get: (key: string) => {
      if (key === CONTEXT_KEY.APP_LOG) return logger
      if (key === CONTEXT_KEY.SESSION_USER) return options.user
      return undefined
    },
    env: { DB: {} },
    req: {
      valid: () => ({ article_id: ARTICLE_ID }),
      method: 'POST',
      routePath: '/api/articles/:article_id/skip',
    },
    // oxlint-disable-next-line typescript/no-restricted-types -- Hono の c.json を模すモックで、任意の JSON 値を受けるため
    json: (data: unknown, status: number) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' },
      }),
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as ArticleActionContext
  return { c, logger }
}

const sessionUser: SessionUser = {
  activeUserId: 7n,
  displayName: 'テスト太郎',
  email: 'user@example.com',
}

function baseConfig<TOutput>(result: Result<TOutput, Error>) {
  return {
    execute: () => Promise.resolve(result),
    statusCode: 200 as const,
  }
}

describe('createArticleActionHandler', () => {
  describe('正常系', () => {
    it('成功時は statusCode 付きでボディ null を返すこと', async () => {
      const handler = createArticleActionHandler({
        ...baseConfig(ok(undefined)),
        statusCode: 201,
      })

      const { c } = buildContext({ user: sessionUser })
      const res = await handler(c)

      expect(res.status).toBe(201)
      expect(await res.json()).toBeNull()
    })

    it('セッションユーザーの activeUserId と検証済み article_id を execute に渡すこと', async () => {
      const execute = vi.fn((_useCase: object, _activeUserId: bigint, _articleId: bigint) =>
        Promise.resolve(ok(undefined)),
      )
      const handler = createArticleActionHandler({ ...baseConfig(ok(undefined)), execute })

      const { c } = buildContext({ user: sessionUser })
      await handler(c)

      expect(execute).toHaveBeenCalledWith(expect.anything(), sessionUser.activeUserId, ARTICLE_ID)
    })

    it('ルート情報と activeUserId・articleId を info ログに出すこと', async () => {
      const handler = createArticleActionHandler(baseConfig(ok(undefined)))

      const { c, logger } = buildContext({ user: sessionUser })
      await handler(c)

      expect(logger.info).toHaveBeenCalledWith({
        msg: 'article action completed',
        method: 'POST',
        route: '/api/articles/:article_id/skip',
        activeUserId: sessionUser.activeUserId,
        articleId: ARTICLE_ID,
      })
    })
  })

  describe('準正常系', () => {
    it.each([
      { name: 'NotFoundError', error: new NotFoundError('not found'), status: 404 },
      { name: 'ClientError', error: new ClientError('bad request', 400), status: 400 },
    ])(
      'execute が $name を返すと handleError で変換した HTTPException を投げること',
      async ({ error, status }) => {
        const handler = createArticleActionHandler(baseConfig(err(error)))

        const { c } = buildContext({ user: sessionUser })
        // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
        const thrown = await handler(c).catch((e: unknown) => e)

        expect(thrown).toBeInstanceOf(HTTPException)
        expect(thrown).toMatchObject({ status })
      },
    )
  })

  describe('異常系', () => {
    // authenticator が先行適用される契約のため、未設定は 401 に偽装せず契約違反として送出する
    it('SESSION_USER が未設定なら契約違反エラーを投げること', async () => {
      const handler = createArticleActionHandler(baseConfig(ok(undefined)))

      const { c } = buildContext()

      await expect(handler(c)).rejects.toThrow(CONTEXT_KEY.SESSION_USER)
    })
  })
})
