import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import usePasskeyStatus from './use-passkey-status'

const mockApiClient = {
  auth: {
    passkey: {
      $get: vi.fn(),
    },
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

// テスト間でSWRキャッシュを共有しないよう、毎回新しいproviderで包む
function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    children,
  )
}

describe('usePasskeyStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  describe('正常系', () => {
    it('hasPasskey=trueが返るとhasPasskeyがtrueになる', async () => {
      mockApiClient.auth.passkey.$get.mockResolvedValue({
        ok: true,
        json: async () => ({ hasPasskey: true }),
      })

      const { result } = renderHook(() => usePasskeyStatus(), { wrapper })

      await waitFor(() => {
        expect(result.current.hasPasskey).toBe(true)
      })
    })

    it('hasPasskey=falseが返るとhasPasskeyがfalseになる', async () => {
      mockApiClient.auth.passkey.$get.mockResolvedValue({
        ok: true,
        json: async () => ({ hasPasskey: false }),
      })

      const { result } = renderHook(() => usePasskeyStatus(), { wrapper })

      await waitFor(() => {
        expect(mockApiClient.auth.passkey.$get).toHaveBeenCalled()
      })
      expect(result.current.hasPasskey).toBe(false)
    })
  })

  describe('準正常系', () => {
    it('レスポンスが非OKならhasPasskeyはfalseのまま', async () => {
      mockApiClient.auth.passkey.$get.mockResolvedValue({ ok: false, status: 401 })

      const { result } = renderHook(() => usePasskeyStatus(), { wrapper })

      await waitFor(() => {
        expect(mockApiClient.auth.passkey.$get).toHaveBeenCalled()
      })
      expect(result.current.hasPasskey).toBe(false)
    })
  })
})
