import { act, renderHook, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import useLogout from './use-logout'

const navigateMock = vi.fn()

vi.mock('react-router', () => ({
  useNavigate: () => navigateMock,
}))

const apiCallMock = vi.fn()
const sessionDeleteMock = vi.fn()

vi.mock('@/client/infrastructure/create-swr-fetcher', () => ({
  default: () => ({
    apiCall: apiCallMock,
    client: { sessions: { $delete: sessionDeleteMock } },
  }),
}))

// グローバル設定の no-op trigger では onSuccess/onError が発火しないため、
// 実際の trigger 相当の振る舞いに差し替えてコールバックまで検証する
vi.mock('swr/mutation', () => ({
  default: <Data, Arg>(
    key: string,
    fetcher: (key: string, options: { arg: Arg }) => Promise<Data>,
    // oxlint-disable-next-line typescript/no-restricted-types -- catch で受ける失敗値は任意の型となり確定できないため
    options?: { onSuccess?: (data: Data) => void; onError?: (error: unknown) => void },
  ) => ({
    trigger: async (arg: Arg) => {
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
    it('ログアウト成功時は/sessionsへ遷移して成功トーストを表示する', async () => {
      apiCallMock.mockResolvedValue(null)

      const { result } = renderHook(() => useLogout())

      await act(async () => {
        result.current.handleLogout()
      })

      await waitFor(() => {
        expect(navigateMock).toHaveBeenCalledWith('/sessions')
      })
      expect(apiCallMock).toHaveBeenCalledTimes(1)
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
      expect(toast.success).not.toHaveBeenCalled()
    })
  })
})
