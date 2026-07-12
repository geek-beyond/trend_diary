import { renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { toast } from 'sonner'
import { SWRConfig } from 'swr'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import useThemePreference from './use-theme-preference'

const mockApiClient = {
  auth: {
    me: {
      $get: vi.fn(),
      theme: {
        $put: vi.fn(),
      },
    },
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClient = getApiClientForClient as MockedFunction<any>

// テスト間でSWRキャッシュを共有しないよう、毎回新しいproviderで包む
function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    children,
  )
}

describe('useThemePreference', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClient.mockReturnValue(mockApiClient)
  })

  describe('正常系', () => {
    it('/meのテーマを取得してserverThemeに反映する', async () => {
      mockApiClient.auth.me.$get.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { displayName: null, theme: 'dark' } }),
      })

      const { result } = renderHook(() => useThemePreference(), { wrapper })

      await waitFor(() => {
        expect(result.current.serverTheme).toBe('dark')
      })
    })

    it('saveThemeで選択テーマをサーバーに保存する', async () => {
      mockApiClient.auth.me.$get.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { displayName: null, theme: 'system' } }),
      })
      mockApiClient.auth.me.theme.$put.mockResolvedValue({
        ok: true,
        json: async () => ({ theme: 'light' }),
      })

      const { result } = renderHook(() => useThemePreference(), { wrapper })

      const saved = await result.current.saveTheme('light')

      expect(saved).toBe(true)
      expect(mockApiClient.auth.me.theme.$put).toHaveBeenCalledWith({ json: { theme: 'light' } })
    })
  })

  describe('準正常系', () => {
    it('未ログイン(401)ではserverThemeがnullになる', async () => {
      mockApiClient.auth.me.$get.mockResolvedValue({ ok: false, status: 401 })

      const { result } = renderHook(() => useThemePreference(), { wrapper })

      await waitFor(() => {
        expect(mockApiClient.auth.me.$get).toHaveBeenCalled()
      })
      expect(result.current.serverTheme).toBeNull()
    })

    it('保存に失敗するとfalseを返しエラートーストを出す', async () => {
      mockApiClient.auth.me.$get.mockResolvedValue({ ok: false, status: 401 })
      mockApiClient.auth.me.theme.$put.mockResolvedValue({ ok: false, status: 500 })

      const { result } = renderHook(() => useThemePreference(), { wrapper })

      const saved = await result.current.saveTheme('dark')

      expect(saved).toBe(false)
      expect(toast.error).toHaveBeenCalled()
    })
  })
})
