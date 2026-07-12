import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { SWRConfig } from 'swr'
import type { MockedFunction } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import getApiClientForClient from '@/infrastructure/api'
import ThemeToggle from './theme-toggle'

const setThemeMock = vi.fn()
const themeState: { theme: string | undefined } = { theme: 'system' }

vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: themeState.theme, setTheme: setThemeMock }),
}))

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

function renderToggle() {
  return render(createElement(ThemeToggle), { wrapper })
}

describe('ThemeToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    themeState.theme = 'system'
    mockGetApiClient.mockReturnValue(mockApiClient)
    // 設定画面はログイン時のみ表示されるため既定はテーマ取得成功とする
    mockApiClient.auth.me.$get.mockResolvedValue({
      ok: true,
      json: async () => ({ user: { displayName: null, theme: 'system' } }),
    })
    mockApiClient.auth.me.theme.$put.mockResolvedValue({
      ok: true,
      json: async () => ({ theme: 'light' }),
    })
  })

  describe('正常系', () => {
    it('現在のテーマのボタンにのみ選択スタイルが当たる', () => {
      themeState.theme = 'dark'

      renderToggle()

      expect(screen.getByRole('button', { name: 'ダーク' })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByRole('button', { name: 'システム' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
      expect(screen.getByRole('button', { name: 'ライト' })).toHaveAttribute(
        'aria-pressed',
        'false',
      )
    })

    it('ボタンを押すと選択したテーマでsetThemeが呼ばれる', () => {
      renderToggle()

      fireEvent.click(screen.getByRole('button', { name: 'ライト' }))

      expect(setThemeMock).toHaveBeenCalledWith('light')
    })

    it('ボタンを押すと選択したテーマをサーバーにも保存する', async () => {
      renderToggle()

      fireEvent.click(screen.getByRole('button', { name: 'ライト' }))

      await waitFor(() => {
        expect(mockApiClient.auth.me.theme.$put).toHaveBeenCalledWith({ json: { theme: 'light' } })
      })
    })
  })
})
