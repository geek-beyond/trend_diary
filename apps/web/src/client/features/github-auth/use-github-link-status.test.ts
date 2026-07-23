import { renderHook, waitFor } from '@testing-library/react'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import SwrTestWrapper from '@/test/helper/swr'
import useGithubLinkStatus from './use-github-link-status'

const mockApiClient = {
  oauth: {
    ':provider': {
      $get: vi.fn(),
    },
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClientForClient = getApiClientForClient as MockedFunction<any>

describe('useGithubLinkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  describe('正常系', () => {
    it('連携済みのレスポンスなら連携ありと判定する', async () => {
      mockApiClient.oauth[':provider'].$get.mockResolvedValue({
        ok: true,
        json: async () => ({ linked: true }),
      })

      const { result } = renderHook(() => useGithubLinkStatus(), { wrapper: SwrTestWrapper })

      await waitFor(() => {
        expect(result.current.linked).toBe(true)
      })
    })

    it('未連携のレスポンスなら連携なしと判定する', async () => {
      mockApiClient.oauth[':provider'].$get.mockResolvedValue({
        ok: true,
        json: async () => ({ linked: false }),
      })

      const { result } = renderHook(() => useGithubLinkStatus(), { wrapper: SwrTestWrapper })

      await waitFor(() => {
        expect(mockApiClient.oauth[':provider'].$get).toHaveBeenCalled()
      })
      expect(result.current.linked).toBe(false)
    })
  })

  describe('準正常系', () => {
    it('取得に失敗したら連携なし扱いになる', async () => {
      mockApiClient.oauth[':provider'].$get.mockResolvedValue({ ok: false, status: 401 })

      const { result } = renderHook(() => useGithubLinkStatus(), { wrapper: SwrTestWrapper })

      await waitFor(() => {
        expect(mockApiClient.oauth[':provider'].$get).toHaveBeenCalled()
      })
      expect(result.current.linked).toBe(false)
    })
  })
})
