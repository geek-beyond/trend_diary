import { act, renderHook, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SESSION_SWR_KEY } from '@/client/entities/auth'
import useLogout from './use-logout'

const navigateMock = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}))

const mutateMock = vi.fn()

vi.mock('swr', () => ({
  default: vi.fn(),
  useSWRConfig: () => ({ mutate: mutateMock }),
}))

const apiCallMock = vi.fn()
const logoutDeleteMock = vi.fn()

vi.mock('@/client/infrastructure/create-swr-fetcher', () => ({
  default: () => ({
    apiCall: apiCallMock,
    client: { auth: { logout: { $delete: logoutDeleteMock } } },
  }),
}))

// グローバル設定の no-op trigger では onSuccess/onError が発火しないため、
// 実際の trigger 相当の振る舞いに差し替えてコールバックまで検証する
vi.mock('swr/mutation', () => ({
  default: (
    key: string,
    fetcher: (key: string, options: { arg: unknown }) => Promise<unknown>,
    options?: { onSuccess?: (data: unknown) => void; onError?: (error: unknown) => void },
  ) => ({
    trigger: async (arg: unknown) => {
      try {
        const data = await fetcher(key, { arg })
        options?.onSuccess?.(data)
      } catch (error) {
        options?.onError?.(error)
      }
    },
    isMutating: false,
  }),
}))

describe('useLogout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('正常系', () => {
    it('ログアウト成功時はセッションキャッシュを即時に未ログインへ更新し/loginへ遷移して成功トーストを表示する', async () => {
      apiCallMock.mockResolvedValue(null)

      const { result } = renderHook(() => useLogout())

      await act(async () => {
        result.current.handleLogout()
      })

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith('/login')
      })
      expect(apiCallMock).toHaveBeenCalledTimes(1)
      // 古いログイン状態のまま navigate 後に ProtectedLayout の redirect クエリ付き遷移と
      // 競合しないよう、revalidate を待たず即時反映する
      expect(mutateMock).toHaveBeenCalledWith(SESSION_SWR_KEY, false, { revalidate: false })
      expect(toast.success).toHaveBeenCalledWith('ログアウトしました')
      expect(toast.error).not.toHaveBeenCalled()
    })
  })

  describe('異常系', () => {
    it('ログアウト失敗時は失敗トーストを表示し遷移しない', async () => {
      apiCallMock.mockRejectedValue(new Error('network error'))

      const { result } = renderHook(() => useLogout())

      await act(async () => {
        result.current.handleLogout()
      })

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('ログアウトに失敗しました')
      })
      expect(navigateMock).not.toHaveBeenCalled()
      expect(mutateMock).not.toHaveBeenCalled()
      expect(toast.success).not.toHaveBeenCalled()
    })
  })
})
