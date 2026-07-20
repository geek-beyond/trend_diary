import { act, renderHook } from '@testing-library/react'
import type { MockedFunction } from 'vitest'
import { buildFormData } from '@/client/test/helper/form-data'
import getApiClientForClient from '@/infrastructure/api'
import useSignup from './use-signup'

const navigateMock = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  // oxlint-disable-next-line typescript/consistent-type-imports -- vitestのimportOriginalにモジュール型を渡す定型のため inline import 型を許可する
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

const mockApiClient = {
  registrations: {
    $post: vi.fn(),
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

const validForm = { email: 'test@example.com', password: 'Password1!' }

describe('useSignup', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
    mockApiClient.registrations.$post.mockResolvedValue({ ok: true, status: 201 })
  })

  describe('正常系', () => {
    it('フォームの値をJSONボディとしてPOST /api/registrationsへ送る', async () => {
      const { result } = renderHook(() => useSignup('site-key'))

      await act(async () => {
        await result.current.submit(
          buildFormData({ ...validForm, 'cf-turnstile-response': 'captcha-token' }),
        )
      })

      expect(mockApiClient.registrations.$post).toHaveBeenCalledWith({
        json: { ...validForm, captchaToken: 'captcha-token' },
      })
    })

    it('サインアップ成功時は/sessionsへ遷移する', async () => {
      const { result } = renderHook(() => useSignup())

      await act(async () => {
        await result.current.submit(buildFormData(validForm))
      })

      expect(navigateMock).toHaveBeenCalledWith('/sessions')
      expect(result.current.formError).toBeUndefined()
    })
  })

  describe('準正常系', () => {
    it('フォームの値が不正な場合はフィールドエラーを設定しAPIを呼ばない', async () => {
      const { result } = renderHook(() => useSignup())

      await act(async () => {
        await result.current.submit(buildFormData({ email: 'invalid', password: '' }))
      })

      expect(result.current.errors).toBeDefined()
      expect(mockApiClient.registrations.$post).not.toHaveBeenCalled()
    })

    it('CAPTCHA有効時にトークンなしで送信した場合はformErrorを設定しAPIを呼ばない', async () => {
      const { result } = renderHook(() => useSignup('site-key'))

      await act(async () => {
        await result.current.submit(buildFormData(validForm))
      })

      expect(result.current.formError).toBe('セキュリティ認証を完了してください。')
      expect(mockApiClient.registrations.$post).not.toHaveBeenCalled()
    })

    it.each([
      { status: 409, expected: 'このメールアドレスは既に使用されています' },
      { status: 403, expected: 'セキュリティ認証を完了してください。' },
      {
        status: 429,
        expected: '試行回数が上限に達しました。しばらく時間をおいて再度お試しください。',
      },
      { status: 500, expected: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' },
    ])(
      'APIが$statusを返した場合はformError「$expected」を設定する',
      async ({ status, expected }) => {
        mockApiClient.registrations.$post.mockResolvedValue({ ok: false, status })
        const { result } = renderHook(() => useSignup())

        await act(async () => {
          await result.current.submit(buildFormData(validForm))
        })

        expect(result.current.formError).toBe(expected)
        expect(navigateMock).not.toHaveBeenCalled()
      },
    )
  })

  describe('異常系', () => {
    it('API呼び出しで例外が発生した場合は汎用エラーメッセージを設定する', async () => {
      mockApiClient.registrations.$post.mockRejectedValue(new Error('network error'))
      const { result } = renderHook(() => useSignup())

      await act(async () => {
        await result.current.submit(buildFormData(validForm))
      })

      expect(result.current.formError).toBe('予期せぬエラーが発生しました。')
      expect(navigateMock).not.toHaveBeenCalled()
    })
  })
})
