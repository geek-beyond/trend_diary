import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import useSession from './use-session'

const mockApiClient = {
  auth: {
    me: {
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

describe('useSession', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClientForClient.mockReturnValue(mockApiClient)
  })

  it('セッション確認が完了するまではisLoggedInがfalse', () => {
    mockApiClient.auth.me.$get.mockReturnValue(new Promise(() => undefined))

    const { result } = renderHook(() => useSession(), { wrapper })

    expect(result.current.isLoggedIn).toBe(false)
  })

  it('GET /api/auth/me が200を返した場合はisLoggedInがtrueになる', async () => {
    mockApiClient.auth.me.$get.mockResolvedValue({ ok: true, status: 200 })

    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => {
      expect(result.current.isLoggedIn).toBe(true)
    })
  })

  it('未ログイン（401）の場合はisLoggedInがfalseのまま', async () => {
    mockApiClient.auth.me.$get.mockResolvedValue({ ok: false, status: 401 })

    const { result } = renderHook(() => useSession(), { wrapper })

    await waitFor(() => {
      expect(mockApiClient.auth.me.$get).toHaveBeenCalled()
    })
    expect(result.current.isLoggedIn).toBe(false)
  })
})
