import { act, renderHook } from '@testing-library/react'
import type { MockedFunction } from 'vitest'
import { SESSION_SWR_KEY } from '@/client/entities/session'
import { buildFormData } from '@/client/test/helper/form-data'
import getApiClientForClient from '@/infrastructure/api'
import useLogin from './use-login'

const navigateMock = vi.fn()
const mutateMock = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  // oxlint-disable-next-line typescript/consistent-type-imports -- vitestのimportOriginalにモジュール型を渡す定型のため inline import 型を許可する
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('swr', () => ({ useSWRConfig: () => ({ mutate: mutateMock }) }))

const mockApiClient = {
  sessions: {
    $post: vi.fn(),
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

const validForm = { email: 'test@example.com', password: 'Password1!' }

describe('useLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
    mockApiClient.sessions.$post.mockResolvedValue({ ok: true, status: 200 })
  })

  describe('正常系', () => {
    it('フォームの値をJSONボディとしてPOST /api/sessionsへ送る', async () => {
      const { result } = renderHook(() => useLogin('site-key'))

      await act(async () => {
        await result.current.submit(
          buildFormData({ ...validForm, 'cf-turnstile-response': 'captcha-token' }),
        )
      })

      expect(mockApiClient.sessions.$post).toHaveBeenCalledWith({
        json: { ...validForm, captchaToken: 'captcha-token' },
      })
    })

    it('ログイン成功時は/trendsへ遷移する', async () => {
      const { result } = renderHook(() => useLogin())

      await act(async () => {
        await result.current.submit(buildFormData(validForm))
      })

      expect(navigateMock).toHaveBeenCalledWith('/trends')
      expect(result.current.formError).toBeUndefined()
    })

    it('ログイン成功時は購読者の有無に依存せずセッションキャッシュを直接ログイン済みへ更新する', async () => {
      const { result } = renderHook(() => useLogin())

      await act(async () => {
        await result.current.submit(buildFormData(validForm))
      })

      expect(mutateMock).toHaveBeenCalledWith(SESSION_SWR_KEY, true, { revalidate: false })
    })

    it('redirectToを指定した場合、ログイン成功時はそのパスへ遷移する', async () => {
      const { result } = renderHook(() => useLogin(undefined, '/diary?page=2'))

      await act(async () => {
        await result.current.submit(buildFormData(validForm))
      })

      expect(navigateMock).toHaveBeenCalledWith('/diary?page=2')
    })
  })

  describe('準正常系', () => {
    it('フォームの値が不正な場合はフィールドエラーを設定しAPIを呼ばない', async () => {
      const { result } = renderHook(() => useLogin())

      await act(async () => {
        await result.current.submit(buildFormData({ email: 'invalid', password: '' }))
      })

      expect(result.current.errors).toBeDefined()
      expect(mockApiClient.sessions.$post).not.toHaveBeenCalled()
    })

    it('CAPTCHA有効時にトークンなしで送信した場合はformErrorを設定しAPIを呼ばない', async () => {
      const { result } = renderHook(() => useLogin('site-key'))

      await act(async () => {
        await result.current.submit(buildFormData(validForm))
      })

      expect(result.current.formError).toBe('セキュリティ認証を完了してください。')
      expect(mockApiClient.sessions.$post).not.toHaveBeenCalled()
    })

    it.each([
      { status: 401, expected: 'メールアドレスまたはパスワードが正しくありません' },
      { status: 403, expected: 'セキュリティ認証を完了してください。' },
      {
        status: 429,
        expected: '試行回数が上限に達しました。しばらく時間をおいて再度お試しください。',
      },
      { status: 500, expected: 'サーバーエラーが発生しました。時間をおいて再度お試しください。' },
    ])(
      'APIが$statusを返した場合はformError「$expected」を設定する',
      async ({ status, expected }) => {
        mockApiClient.sessions.$post.mockResolvedValue({ ok: false, status })
        const { result } = renderHook(() => useLogin())

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
      mockApiClient.sessions.$post.mockRejectedValue(new Error('network error'))
      const { result } = renderHook(() => useLogin())

      await act(async () => {
        await result.current.submit(buildFormData(validForm))
      })

      expect(result.current.formError).toBe('予期せぬエラーが発生しました。')
      expect(navigateMock).not.toHaveBeenCalled()
    })
  })
})
