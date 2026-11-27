import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'
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
      expect(mockApiClient.oauth[':provider'].$get).toHaveBeenCalledWith({
        param: { provider: 'github' },
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
    it.each([
      { status: 401, shouldReport: false },
      { status: 503, shouldReport: true },
    ])(
      'status=$status は未連携表示とし、障害通知の要否を区別する',
      async ({ status, shouldReport }) => {
        const onError = vi.fn()
        const json = vi.fn()
        mockApiClient.oauth[':provider'].$get.mockResolvedValue({ ok: false, status, json })
        const wrapper = ({ children }: { children: ReactNode }) =>
          createElement(
            SWRConfig,
            { value: { onError, shouldRetryOnError: false } },
            createElement(SwrTestWrapper, null, children),
          )
        const { result } = renderHook(() => useGithubLinkStatus(), { wrapper })
        await waitFor(() => expect(result.current.isLoading).toBe(false))
        expect(result.current.linked).toBe(false)
        expect(json).not.toHaveBeenCalled()
        if (shouldReport) {
          expect(onError).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Failed to fetch GitHub link status: 503' }),
            expect.anything(),
            expect.anything(),
          )
        } else {
          expect(onError).not.toHaveBeenCalled()
        }
      },
    )
  })
})
