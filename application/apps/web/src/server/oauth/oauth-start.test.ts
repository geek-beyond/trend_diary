import type * as AuthModule from '@trend-diary/authentication'
import { UnexpectedAuthError } from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import { err, ok, type Result } from 'neverthrow'
import CONTEXT_KEY from '@/middleware/context'
import { createOAuthStartHandler, type OAuthStartContext } from './oauth-start'
import { OAUTH_FLOW } from './redirect'

// 認可URLの発行はSupabase SDKへ委譲するため、クライアント生成をモックしてファクトリーの制御だけを検証する
vi.mock('@trend-diary/authentication', async (importOriginal) => {
  const actual = await importOriginal<typeof AuthModule>()
  return { ...actual, authClientConfig: vi.fn(() => ({})), OAuthClient: vi.fn() }
})

interface FakeLogger {
  info: ReturnType<typeof vi.fn>
  warn: ReturnType<typeof vi.fn>
  error: ReturnType<typeof vi.fn>
}

const AUTHORIZE_URL = 'https://supabase.example.com/auth/v1/authorize?provider=github'

interface BuildContextOptions {
  hasAppLog?: boolean
}

function buildContext(options: BuildContextOptions = {}): {
  c: OAuthStartContext
  logger: FakeLogger
  setCookies: string[]
} {
  const logger: FakeLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
  const setCookies: string[] = []
  // oxlint-disable-next-line typescript/consistent-type-assertions -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストで、構造的に代入できず二重アサーションが避けられないため
  const c = {
    get: (key: string) => {
      if (key === CONTEXT_KEY.APP_LOG && (options.hasAppLog ?? true)) return logger
      return undefined
    },
    req: {
      valid: () => ({ provider: 'github' }),
      url: 'http://localhost/api/oauth/github/login',
    },
    header: (_name: string, value: string) => {
      setCookies.push(value)
    },
    redirect: (location: string, status: number) =>
      new Response(null, { status, headers: { Location: location } }),
    // oxlint-disable-next-line typescript/no-restricted-types -- 最小限のモックを Hono の複雑な Context 型へ橋渡しする境界キャストのため
  } as unknown as OAuthStartContext
  return { c, logger, setCookies }
}

function findSetCookie(setCookies: string[], prefix: string): string {
  return setCookies.find((cookie) => cookie.startsWith(prefix)) ?? ''
}

// start が返しうるエラーは OAuthClient の実エラー(UnexpectedAuthError)に限られるため、Error でぼかさない
function baseConfig(result: Result<{ url: string }, UnexpectedAuthError>) {
  return {
    start: () => Promise.resolve(result),
    flow: OAUTH_FLOW.login,
    setRedirectCookie: () => {},
  }
}

describe('createOAuthStartHandler', () => {
  describe('正常系', () => {
    it('startが返した認可URLへ302リダイレクトすること', async () => {
      const handler = createOAuthStartHandler(baseConfig(ok({ url: AUTHORIZE_URL })))

      const { c } = buildContext()
      const res = await handler(c)

      expect(res.status).toBe(302)
      expect(res.headers.get('Location')).toBe(AUTHORIZE_URL)
    })

    it('検証済みproviderとリクエストオリジンから組み立てたcallback URLをstartに渡すこと', async () => {
      const start = vi.fn(() => Promise.resolve(ok({ url: AUTHORIZE_URL })))
      const handler = createOAuthStartHandler({ ...baseConfig(ok({ url: AUTHORIZE_URL })), start })

      const { c } = buildContext()
      await handler(c)

      expect(start).toHaveBeenCalledWith(
        expect.anything(),
        'github',
        'http://localhost/api/oauth/github/callback',
      )
    })

    it.each([{ flow: OAUTH_FLOW.login }, { flow: OAUTH_FLOW.link }])(
      'フロー種別Cookieに$flowをOAuthスコープ限定で保存すること',
      async ({ flow }) => {
        const handler = createOAuthStartHandler({ ...baseConfig(ok({ url: AUTHORIZE_URL })), flow })

        const { c, setCookies } = buildContext()
        await handler(c)

        const flowCookie = findSetCookie(setCookies, 'oauth_flow=')
        expect(flowCookie).toContain(`oauth_flow=${flow}`)
        expect(flowCookie).toContain('Path=/api/oauth')
        expect(flowCookie).toContain('HttpOnly')
      },
    )

    // 戻り先Cookieの保存/クリアはフローごとの仕様のため、各ハンドラーのテストで検証する
    it('戻り先Cookieの制御を設定に委譲してコンテキストを渡すこと', async () => {
      const setRedirectCookie = vi.fn()
      const handler = createOAuthStartHandler({
        ...baseConfig(ok({ url: AUTHORIZE_URL })),
        setRedirectCookie,
      })

      const { c } = buildContext()
      await handler(c)

      expect(setRedirectCookie).toHaveBeenCalledWith(c)
    })
  })

  describe('準正常系', () => {
    // エラー種別ごとの写像(NoSessionError→401 等)は error.test.ts が担保する。
    // ここは start のエラーを throwHttpError へ委譲し HTTPException として送出することだけを検証する
    it('startがエラーを返すとthrowHttpError経由でHTTPExceptionを投げること', async () => {
      const error = new UnexpectedAuthError('unexpected')
      const handler = createOAuthStartHandler(baseConfig(err(error)))

      const { c } = buildContext()
      // oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
      const thrown = await handler(c).catch((e: unknown) => e)

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 500, message: error.message })
    })
  })
})
