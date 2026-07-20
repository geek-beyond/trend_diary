import { act, renderHook } from '@testing-library/react'
import type { MockedFunction } from 'vitest'
import { SESSION_SWR_KEY } from '@/client/entities/auth'
import getApiClientForClient from '@/infrastructure/api'
import usePasskeyLogin from './use-passkey-login'

const navigateMock = vi.fn()
const mutateMock = vi.fn()
// vi.mockはimport上へ巻き上げられ、モック実体を factory 内で直接参照するため hoisted で初期化する
const startAuthenticationMock = vi.hoisted(() => vi.fn())

vi.mock('react-router', async (importOriginal) => {
  // oxlint-disable-next-line typescript/consistent-type-imports -- vitestのimportOriginalにモジュール型を渡す定型のため inline import 型を許可する
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('swr', () => ({ useSWRConfig: () => ({ mutate: mutateMock }) }))

vi.mock('@simplewebauthn/browser', () => ({ startAuthentication: startAuthenticationMock }))

const mockApiClient = {
  passkey: {
    login: {
      start: { $post: vi.fn() },
      verify: { $post: vi.fn() },
    },
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

describe('usePasskeyLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
    mockApiClient.passkey.login.start.$post.mockResolvedValue({
      ok: true,
      json: async () => ({ challengeId: 'challenge-1', options: {} }),
    })
    startAuthenticationMock.mockResolvedValue({ id: 'credential-1' })
    mockApiClient.passkey.login.verify.$post.mockResolvedValue({ ok: true, status: 200 })
  })

  describe('正常系', () => {
    it('start→ceremony→verifyが成功するとセッションを再検証して/trendsへ遷移する', async () => {
      const { result } = renderHook(() => usePasskeyLogin())

      await act(async () => {
        await result.current.login()
      })

      expect(mutateMock).toHaveBeenCalledWith(SESSION_SWR_KEY, true, { revalidate: false })
      expect(navigateMock).toHaveBeenCalledWith('/trends')
      expect(result.current.formError).toBeUndefined()
    })

    it('redirectToを指定した場合、成功時はそのパスへ遷移する', async () => {
      const { result } = renderHook(() => usePasskeyLogin('/diary?page=2'))

      await act(async () => {
        await result.current.login()
      })

      expect(navigateMock).toHaveBeenCalledWith('/diary?page=2')
    })
  })

  describe('準正常系', () => {
    it('startが非OKならログイン失敗を表示し遷移しない', async () => {
      mockApiClient.passkey.login.start.$post.mockResolvedValue({ ok: false, status: 500 })
      const { result } = renderHook(() => usePasskeyLogin())

      await act(async () => {
        await result.current.login()
      })

      expect(result.current.formError).toBe('パスキーでのログインに失敗しました。')
      expect(navigateMock).not.toHaveBeenCalled()
    })

    it('ceremonyがキャンセルされたら中断案内を表示し遷移しない', async () => {
      startAuthenticationMock.mockRejectedValue(new Error('canceled'))
      const { result } = renderHook(() => usePasskeyLogin())

      await act(async () => {
        await result.current.login()
      })

      expect(result.current.formError).toBe('パスキーの操作がキャンセルされました。')
      expect(navigateMock).not.toHaveBeenCalled()
    })

    it('verifyが非OKならログイン失敗を表示し遷移しない', async () => {
      mockApiClient.passkey.login.verify.$post.mockResolvedValue({ ok: false, status: 401 })
      const { result } = renderHook(() => usePasskeyLogin())

      await act(async () => {
        await result.current.login()
      })

      expect(result.current.formError).toBe('パスキーでのログインに失敗しました。')
      expect(navigateMock).not.toHaveBeenCalled()
    })
  })
})
