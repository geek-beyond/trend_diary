import { render, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'
import type { MockedFunction } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import ThemeSync from './theme-sync'

const setThemeMock = vi.fn()

vi.mock('next-themes', () => ({
  useTheme: () => ({ setTheme: setThemeMock }),
}))

const mockApiClient = {
  auth: {
    me: {
      $get: vi.fn(),
    },
  },
}

// oxlint-disable-next-line typescript/no-explicit-any, typescript/consistent-type-assertions -- Hono client を返す関数のモックで、ネストした実型に合わせず一部のみをモックするためアサーションで橋渡しする
const mockGetApiClient = getApiClientForClient as MockedFunction<any>

function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    SWRConfig,
    { value: { provider: () => new Map(), dedupingInterval: 0 } },
    children,
  )
}

describe('ThemeSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetApiClient.mockReturnValue(mockApiClient)
  })

  describe('正常系', () => {
    it('サーバーのテーマを取得してnext-themesへ反映する', async () => {
      mockApiClient.auth.me.$get.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { displayName: null, theme: 'dark' } }),
      })

      render(createElement(ThemeSync), { wrapper })

      await waitFor(() => {
        expect(setThemeMock).toHaveBeenCalledWith('dark')
      })
    })
  })

  describe('準正常系', () => {
    it('未ログイン(401)ではテーマを適用しない', async () => {
      mockApiClient.auth.me.$get.mockResolvedValue({ ok: false, status: 401 })

      render(createElement(ThemeSync), { wrapper })

      await waitFor(() => {
        expect(mockApiClient.auth.me.$get).toHaveBeenCalled()
      })
      expect(setThemeMock).not.toHaveBeenCalled()
    })
  })
})
