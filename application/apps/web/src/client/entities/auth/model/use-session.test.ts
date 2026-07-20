import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import useSession from './use-session'

const mockApiClient = {
  sessions: {
    current: {
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
    { value: { provider: () => new Map(), dedupingInterval: 0, shouldRetryOnError: false } },
    children,
  )
}

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  it('セッション確認が完了するまではisLoggedInがfalseかつisLoadingがtrue', () => {
    mockApiClient.sessions.current.$get.mockReturnValue(new Promise(() => undefined))

    const { result } = renderHook(() => useSession(), { wrapper })

    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.isLoading).toBe(true)
  })

  it('GET /api/sessions/current が200を返した場合はisLoggedInがtrueかつisLoadingがfalseになる', async () => {
    mockApiClient.sessions.current.$get.mockResolvedValue({ ok: true, status: 200 })

    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true)
    })
    expect(result.current.isLoading).toBe(false)
  })

  it('未ログイン（401）の場合はisLoggedInがfalseのままかつisLoadingがfalseになる', async () => {
    mockApiClient.sessions.current.$get.mockResolvedValue({ ok: false, status: 401 })

    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => {
      expect(mockApiClient.sessions.current.$get).toHaveBeenCalled()
    })
    expect(result.current.isLoggedIn).toBe(false)
    expect(result.current.isLoading).toBe(false)
  })

  it('通信失敗（例外）の場合はisLoggedInがfalseかつisLoadingがfalseになる', async () => {
    mockApiClient.sessions.current.$get.mockRejectedValue(new Error('Network Error'))

    const { result } = renderHook(() => useSession(), { wrapper })

    // 無限ローディングに陥らず、未ログイン扱いへ収束することを保証する
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.isLoggedIn).toBe(false)
  })
})
