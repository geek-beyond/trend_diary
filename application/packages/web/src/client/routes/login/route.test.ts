import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callAuthApi } from '@/client/features/authenticate/auth-api'
import { resolveTurnstileSiteKey } from '@/client/features/authenticate/turnstile'
import { action, loader, meta } from './route'

vi.mock('@/client/features/authenticate/auth-api', async (importOriginal) => {
  // buildSetCookieHeaders は純粋関数のため実体を使い、API呼び出しのみ差し替える
  const actual = await importOriginal<typeof import('@/client/features/authenticate/auth-api')>()
  return { ...actual, callAuthApi: vi.fn() }
})

// importOriginal経由でserver側のモジュールグラフが評価されるとclientのカバレッジ分母に入ってしまうため遮断する
vi.mock('@/server', () => ({ default: { request: vi.fn() } }))

vi.mock('@/client/features/authenticate/turnstile', () => ({
  resolveTurnstileSiteKey: vi.fn(),
}))

function buildActionArgs(formData: FormData): ActionFunctionArgs {
  const request = new Request('https://trend-diary.example/login', {
    method: 'POST',
    body: formData,
  })
  return {
    request,
    url: new URL(request.url),
    pattern: '/login',
    params: {},
    context: {},
  }
}

function buildLoaderArgs(): LoaderFunctionArgs {
  const request = new Request('https://trend-diary.example/login')
  return {
    request,
    url: new URL(request.url),
    pattern: '/login',
    params: {},
    context: {},
  }
}

function buildMetaArgs(): Parameters<typeof meta>[0] {
  return {
    data: undefined,
    loaderData: undefined,
    params: {},
    location: { pathname: '/login', search: '', hash: '', state: null, key: 'default' },
    matches: [],
  }
}

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [name, value] of Object.entries(entries)) {
    formData.append(name, value)
  }
  return formData
}

function buildResponse(status: number, setCookies: string[] = []): Response {
  const headers = new Headers()
  for (const setCookie of setCookies) {
    headers.append('Set-Cookie', setCookie)
  }
  return new Response(null, { status, headers })
}

const validForm = { email: 'test@example.com', password: 'Password1!' }

describe('login action', () => {
  beforeEach(() => {
    vi.mocked(callAuthApi).mockReset()
    vi.mocked(resolveTurnstileSiteKey).mockReset()
    vi.mocked(resolveTurnstileSiteKey).mockReturnValue(undefined)
  })

  it('フォームの値が不正な場合はフィールドエラーを返しAPIを呼ばない', async () => {
    const result = await action(buildActionArgs(buildFormData({ email: 'invalid', password: '' })))

    if (result instanceof Response) {
      throw new Error('action must return field errors')
    }
    expect(result.errors).toBeDefined()
    expect(callAuthApi).not.toHaveBeenCalled()
  })

  it('CAPTCHA有効時にトークンなしで送信した場合はformErrorを返しAPIを呼ばない', async () => {
    vi.mocked(resolveTurnstileSiteKey).mockReturnValue('site-key')

    const result = await action(buildActionArgs(buildFormData(validForm)))

    if (result instanceof Response) {
      throw new Error('action must return a form error')
    }
    expect(result.formError).toBe('セキュリティ認証を完了してください。')
    expect(callAuthApi).not.toHaveBeenCalled()
  })

  it('フォームの値をJSONボディとしてPOST /api/auth/loginへ送る', async () => {
    vi.mocked(resolveTurnstileSiteKey).mockReturnValue('site-key')
    vi.mocked(callAuthApi).mockResolvedValue(buildResponse(200))
    const args = buildActionArgs(
      buildFormData({ ...validForm, 'cf-turnstile-response': 'captcha-token' }),
    )

    await action(args)

    expect(callAuthApi).toHaveBeenCalledWith(args.request, args.context, {
      path: '/api/auth/login',
      method: 'POST',
      body: { ...validForm, captchaToken: 'captcha-token' },
    })
  })

  it('ログイン成功時はAPIのSet-Cookieを転送して/trendsへリダイレクトする', async () => {
    vi.mocked(callAuthApi).mockResolvedValue(
      buildResponse(200, ['sb-access-token=access; Path=/', 'sb-refresh-token=refresh; Path=/']),
    )

    const result = await action(buildActionArgs(buildFormData(validForm)))

    if (!(result instanceof Response)) {
      throw new Error('action must return a redirect response')
    }
    expect(result.status).toBe(302)
    expect(result.headers.get('Location')).toBe('/trends')
    expect(result.headers.getSetCookie()).toEqual([
      'sb-access-token=access; Path=/',
      'sb-refresh-token=refresh; Path=/',
    ])
  })

  it.each([
    { status: 401, expected: 'メールアドレスまたはパスワードが正しくありません' },
    { status: 403, expected: 'セキュリティ認証を完了してください。' },
    {
      status: 429,
      expected: '試行回数が上限に達しました。しばらく時間をおいて再度お試しください。',
    },
    { status: 500, expected: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' },
  ])('APIが$statusを返した場合はformError「$expected」を返す', async ({ status, expected }) => {
    vi.mocked(callAuthApi).mockResolvedValue(buildResponse(status))

    const result = await action(buildActionArgs(buildFormData(validForm)))

    if (result instanceof Response) {
      throw new Error('action must return a form error')
    }
    expect(result.formError).toBe(expected)
  })

  it('API呼び出しで例外が発生した場合は汎用エラーメッセージを返す', async () => {
    vi.mocked(callAuthApi).mockRejectedValue(new Error('network error'))

    const result = await action(buildActionArgs(buildFormData(validForm)))

    if (result instanceof Response) {
      throw new Error('action must return a form error')
    }
    expect(result.formError).toBe('予期せぬエラーが発生しました。')
  })
})

describe('login loader', () => {
  beforeEach(() => {
    vi.mocked(resolveTurnstileSiteKey).mockReset()
  })

  it('Turnstileサイトキーが設定されている場合はそれを返す', () => {
    vi.mocked(resolveTurnstileSiteKey).mockReturnValue('site-key')

    expect(loader(buildLoaderArgs())).toEqual({ turnstileSiteKey: 'site-key' })
  })

  it('Turnstileサイトキーが未設定の場合はnullを返しウィジェットを描画させない', () => {
    vi.mocked(resolveTurnstileSiteKey).mockReturnValue(undefined)

    expect(loader(buildLoaderArgs())).toEqual({ turnstileSiteKey: null })
  })
})

describe('login meta', () => {
  it('ログインページのタイトルとdescriptionを返す', () => {
    const tags = meta(buildMetaArgs())

    expect(tags).toContainEqual({ title: 'ログイン | TrendDiary' })
    expect(tags).toContainEqual(expect.objectContaining({ name: 'description' }))
  })
})
