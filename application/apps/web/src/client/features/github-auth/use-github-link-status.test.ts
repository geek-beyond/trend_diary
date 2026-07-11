import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import useGithubLinkStatus from './use-github-link-status'

const mockApiClient = {
  oauth: {
    github: {
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

describe('useGithubLinkStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  describe('正常系', () => {
    it('連携済みのレスポンスならlinkedがtrueになる', async () => {
      mockApiClient.oauth.github.$get.mockResolvedValue({
        ok: true,
        json: async () => ({ linked: true }),
      })

      const { result } = renderHook(() => useGithubLinkStatus(), { wrapper })

      await waitFor(() => {
        expect(result.current.linked).toBe(true)
      })
    })

    it('未連携のレスポンスならlinkedはfalseになる', async () => {
      mockApiClient.oauth.github.$get.mockResolvedValue({
        ok: true,
        json: async () => ({ linked: false }),
      })

      const { result } = renderHook(() => useGithubLinkStatus(), { wrapper })

      await waitFor(() => {
        expect(mockApiClient.oauth.github.$get).toHaveBeenCalled()
      })
      expect(result.current.linked).toBe(false)
    })
  })

  describe('準正常系', () => {
    it('取得に失敗したらlinkedはfalseのまま', async () => {
      mockApiClient.oauth.github.$get.mockResolvedValue({ ok: false, status: 401 })

      const { result } = renderHook(() => useGithubLinkStatus(), { wrapper })

      await waitFor(() => {
        expect(mockApiClient.oauth.github.$get).toHaveBeenCalled()
      })
      expect(result.current.linked).toBe(false)
    })
  })
})
