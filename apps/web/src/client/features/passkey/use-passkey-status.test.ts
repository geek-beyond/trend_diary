import { renderHook, waitFor } from '@testing-library/react'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import SwrTestWrapper from '@/test/helper/swr'
import usePasskeyStatus from './use-passkey-status'

const mockApiClient = {
  passkey: {
    $get: vi.fn(),
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

describe('usePasskeyStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  describe('正常系', () => {
    it('登録済みのレスポンスなら登録ありと判定する', async () => {
      mockApiClient.passkey.$get.mockResolvedValue({
        ok: true,
        json: async () => ({ hasPasskey: true }),
      })

      const { result } = renderHook(() => usePasskeyStatus(), { wrapper: SwrTestWrapper })

      await waitFor(() => {
        expect(result.current.hasPasskey).toBe(true)
      })
    })

    it('未登録のレスポンスなら登録なしと判定する', async () => {
      mockApiClient.passkey.$get.mockResolvedValue({
        ok: true,
        json: async () => ({ hasPasskey: false }),
      })

      const { result } = renderHook(() => usePasskeyStatus(), { wrapper: SwrTestWrapper })

      await waitFor(() => {
        expect(mockApiClient.passkey.$get).toHaveBeenCalled()
      })
      expect(result.current.hasPasskey).toBe(false)
    })
  })

  describe('準正常系', () => {
    it('取得に失敗したら登録なし扱いになる', async () => {
      mockApiClient.passkey.$get.mockResolvedValue({ ok: false, status: 401 })

      const { result } = renderHook(() => usePasskeyStatus(), { wrapper: SwrTestWrapper })

      await waitFor(() => {
        expect(mockApiClient.passkey.$get).toHaveBeenCalled()
      })
      expect(result.current.hasPasskey).toBe(false)
    })
  })
})
