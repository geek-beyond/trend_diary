import { startAuthentication } from '@simplewebauthn/browser'
import { act, renderHook } from '@testing-library/react'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import usePasskeyLogin from './use-passkey-login'
import { SESSION_SWR_KEY } from './use-session'

const navigateMock = vi.fn()
const mutateMock = vi.fn()

vi.mock('react-router', async (importOriginal) => {
  // oxlint-disable-next-line typescript/consistent-type-imports -- vitestのimportOriginalにモジュール型を渡す定型のため inline import 型を許可する
  const actual = await importOriginal<typeof import('react-router')>()
  return { ...actual, useNavigate: () => navigateMock }
})

vi.mock('swr', () => ({ useSWRConfig: () => ({ mutate: mutateMock }) }))

vi.mock('@simplewebauthn/browser', () => ({ startAuthentication: vi.fn() }))

const startAuthenticationMock = startAuthentication as MockedFunction<typeof startAuthentication>

const mockApiClient = {
  auth: {
    passkey: {
      login: {
        start: { $post: vi.fn() },
        verify: { $post: vi.fn() },
      },
    },
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

describe('usePasskeyLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
    mockApiClient.auth.passkey.login.start.$post.mockResolvedValue({
      ok: true,
      json: async () => ({ challengeId: 'challenge-1', options: {} }),
    })
    // oxlint-disable-next-line typescript/consistent-type-assertions -- ブラウザWebAuthn APIの戻り値をテスト用に最小限で満たすため
    startAuthenticationMock.mockResolvedValue({ id: 'credential-1' } as never)
    mockApiClient.auth.passkey.login.verify.$post.mockResolvedValue({ ok: true, status: 200 })
  })

  describe('正常系', () => {
    it('start→ceremony→verifyが成功するとセッションを再検証して/trendsへ遷移する', async () => {
      const { result } = renderHook(() => usePasskeyLogin())

      await act(async () => {
        await result.current.login()
      })

      expect(mutateMock).toHaveBeenCalledWith(SESSION_SWR_KEY)
      expect(navigateMock).toHaveBeenCalledWith('/trends')
      expect(result.current.formError).toBeUndefined()
    })
  })

  describe('準正常系', () => {
    it('startが非OKならログイン失敗を表示し遷移しない', async () => {
      mockApiClient.auth.passkey.login.start.$post.mockResolvedValue({ ok: false, status: 500 })
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
      mockApiClient.auth.passkey.login.verify.$post.mockResolvedValue({ ok: false, status: 401 })
      const { result } = renderHook(() => usePasskeyLogin())

      await act(async () => {
        await result.current.login()
      })

      expect(result.current.formError).toBe('パスキーでのログインに失敗しました。')
      expect(navigateMock).not.toHaveBeenCalled()
    })
  })
})
