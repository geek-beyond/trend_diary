import type { ActionFunctionArgs } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { callAuthApi } from '@/client/features/authenticate/auth-api'
import { resolveTurnstileSiteKey } from '@/client/features/authenticate/turnstile'
import { action } from './route'

vi.mock('@/client/features/authenticate/auth-api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/client/features/authenticate/auth-api')>()
  return { ...actual, callAuthApi: vi.fn() }
})

vi.mock('@/client/features/authenticate/turnstile', () => ({
  resolveTurnstileSiteKey: vi.fn(),
}))

function buildActionArgs(formData: FormData): ActionFunctionArgs {
  const request = new Request('https://trend-diary.example/signup', {
    method: 'POST',
    body: formData,
  })
  return {
    request,
    url: new URL(request.url),
    pattern: '/signup',
    params: {},
    context: {},
  }
}

function buildFormData(entries: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [name, value] of Object.entries(entries)) {
    formData.append(name, value)
  }
  return formData
}

const validForm = { email: 'test@example.com', password: 'Password1!' }

describe('signup action', () => {
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

  it('フォームの値をJSONボディとしてPOST /api/auth/signupへ送る', async () => {
    vi.mocked(resolveTurnstileSiteKey).mockReturnValue('site-key')
    vi.mocked(callAuthApi).mockResolvedValue(new Response(null, { status: 201 }))
    const args = buildActionArgs(
      buildFormData({ ...validForm, 'cf-turnstile-response': 'captcha-token' }),
    )

    await action(args)

    expect(callAuthApi).toHaveBeenCalledWith(args.request, args.context, {
      path: '/api/auth/signup',
      method: 'POST',
      body: { ...validForm, captchaToken: 'captcha-token' },
    })
  })

  it('サインアップ成功(201)時は/loginへリダイレクトする', async () => {
    vi.mocked(callAuthApi).mockResolvedValue(new Response(null, { status: 201 }))

    const result = await action(buildActionArgs(buildFormData(validForm)))

    if (!(result instanceof Response)) {
      throw new Error('action must return a redirect response')
    }
    expect(result.status).toBe(302)
    expect(result.headers.get('Location')).toBe('/login')
  })

  it.each([
    { status: 409, expected: 'このメールアドレスは既に使用されています' },
    { status: 403, expected: 'セキュリティ認証を完了してください。' },
    {
      status: 429,
      expected: '試行回数が上限に達しました。しばらく時間をおいて再度お試しください。',
    },
    { status: 500, expected: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' },
  ])('APIが$statusを返した場合はformError「$expected」を返す', async ({ status, expected }) => {
    vi.mocked(callAuthApi).mockResolvedValue(new Response(null, { status }))

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
