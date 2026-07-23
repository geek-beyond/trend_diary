import { act, renderHook } from '@testing-library/react'
import { toast } from 'sonner'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import usePasskeyDisable from './use-passkey-disable'

const mockApiClient = {
  passkey: {
    $delete: vi.fn(),
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

describe('usePasskeyDisable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  describe('正常系', () => {
    it('無効化に成功するとtrueを返し成功トーストを出す', async () => {
      mockApiClient.passkey.$delete.mockResolvedValue({ ok: true, status: 204 })

      const { result } = renderHook(() => usePasskeyDisable())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.disable()
      })

      expect(returned).toBe(true)
      expect(toast.success).toHaveBeenCalledWith('パスキーを無効にしました')
    })
  })

  describe('準正常系', () => {
    it('レスポンスが非OKならfalseを返しエラートーストを出す', async () => {
      mockApiClient.passkey.$delete.mockResolvedValue({ ok: false, status: 500 })

      const { result } = renderHook(() => usePasskeyDisable())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.disable()
      })

      expect(returned).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('パスキーの無効化に失敗しました。')
    })
  })

  describe('異常系', () => {
    it('通信が例外を投げるとfalseを返しエラートーストを出す', async () => {
      mockApiClient.passkey.$delete.mockRejectedValue(new Error('network down'))

      const { result } = renderHook(() => usePasskeyDisable())

      let returned: boolean | undefined
      await act(async () => {
        returned = await result.current.disable()
      })

      expect(returned).toBe(false)
      expect(toast.error).toHaveBeenCalledWith('パスキーの無効化に失敗しました。')
    })
  })
})
