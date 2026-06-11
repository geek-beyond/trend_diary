import type { LoaderFunctionArgs } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callAuthApi } from '@/client/features/authenticate/auth-api'
import { loader } from './app-layout'

vi.mock('@/client/features/authenticate/auth-api', async (importOriginal) => {
  // buildSetCookieHeaders は純粋関数のため実体を使い、API呼び出しのみ差し替える
  const actual = await importOriginal<typeof import('@/client/features/authenticate/auth-api')>()
  return { ...actual, callAuthApi: vi.fn() }
})

// importOriginal経由でserver側のモジュールグラフが評価されるとclientのカバレッジ分母に入ってしまうため遮断する
vi.mock('@/server', () => ({ default: { request: vi.fn() } }))

function buildLoaderArgs(): LoaderFunctionArgs {
  const request = new Request('http://localhost/trends')
  return {
    request,
    url: new URL(request.url),
    pattern: '/trends',
    params: {},
    context: {},
  }
}

function buildResponse(status: number, setCookies: string[] = []): Response {
  const headers = new Headers()
  for (const setCookie of setCookies) {
    headers.append('Set-Cookie', setCookie)
  }
  return new Response(null, { status, headers })
}

describe('app-layout loader', () => {
  beforeEach(() => {
    vi.mocked(callAuthApi).mockReset()
  })

  it('GET /api/auth/me をAPI経由で呼び出してセッションを確認する', async () => {
    vi.mocked(callAuthApi).mockResolvedValue(buildResponse(200))
    const args = buildLoaderArgs()

    await loader(args)

    expect(callAuthApi).toHaveBeenCalledWith(args.request, args.context, {
      path: '/api/auth/me',
      method: 'GET',
    })
  })

  it('APIが200を返した場合はisLoggedInがtrueになる', async () => {
    vi.mocked(callAuthApi).mockResolvedValue(buildResponse(200))

    const result = await loader(buildLoaderArgs())

    expect(result.data).toEqual({ isLoggedIn: true })
  })

  // 未ログインはAPIが401/404で表現するため、例外にせず未ログイン扱いにする
  it.each([
    { status: 401 },
    { status: 404 },
  ])('APIが$statusを返した場合はisLoggedInがfalseになる', async ({ status }) => {
    vi.mocked(callAuthApi).mockResolvedValue(buildResponse(status))

    const result = await loader(buildLoaderArgs())

    expect(result.data).toEqual({ isLoggedIn: false })
  })

  it('セッション更新で付与されたSet-Cookieヘッダーがレスポンスに転送される', async () => {
    vi.mocked(callAuthApi).mockResolvedValue(
      buildResponse(200, ['sb-access-token=refreshed; Path=/']),
    )

    const result = await loader(buildLoaderArgs())

    const headers = result.init?.headers
    if (!(headers instanceof Headers)) {
      throw new Error('headers must be a Headers instance')
    }
    expect(headers.getSetCookie()).toEqual(['sb-access-token=refreshed; Path=/'])
  })

  it('API呼び出しで例外が発生した場合はisLoggedInがfalseにフォールバックする', async () => {
    vi.mocked(callAuthApi).mockRejectedValue(new Error('Supabase auth is not configured.'))

    const result = await loader(buildLoaderArgs())

    expect(result.data).toEqual({ isLoggedIn: false })
  })
})
