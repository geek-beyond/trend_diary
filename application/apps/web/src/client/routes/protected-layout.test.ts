import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import ProtectedLayout from './protected-layout'

vi.mock('@/client/entities/session', () => ({
  useSession: vi.fn(),
}))

const { useSession } = await import('@/client/entities/session')
const mockUseSession = vi.mocked(useSession)

function renderWithChild(initialEntries: string[] = ['/']) {
  const router = createMemoryRouter(
    [
      {
        element: createElement(ProtectedLayout),
        children: [{ index: true, element: createElement('div', null, '保護ページ本体') }],
      },
      {
        path: '/login',
        element: createElement('div', null, 'ログイン画面'),
      },
    ],
    { initialEntries },
  )

  render(createElement(RouterProvider, { router }))

  return router
}

describe('ProtectedLayout', () => {
  describe('正常系', () => {
    it('セッション確定後、ログイン済みなら配下ページを描画する', () => {
      mockUseSession.mockReturnValue({ isLoggedIn: true, isLoading: false })

      renderWithChild()

      expect(screen.queryByText('保護ページ本体')).not.toBeNull()
    })
  })

  describe('準正常系', () => {
    it('セッション確定前は配下ページを描画しない', () => {
      mockUseSession.mockReturnValue({ isLoggedIn: false, isLoading: true })

      renderWithChild()

      expect(screen.queryByText('保護ページ本体')).toBeNull()
    })

    it('未ログインなら元のパスをredirectに付けてログイン画面へ遷移する', () => {
      mockUseSession.mockReturnValue({ isLoggedIn: false, isLoading: false })

      const router = renderWithChild(['/?page=2'])

      expect(screen.queryByText('保護ページ本体')).toBeNull()
      expect(screen.getByText('ログイン画面')).not.toBeNull()
      expect(router.state.location.pathname).toBe('/login')
      expect(router.state.location.search).toBe(`?redirect=${encodeURIComponent('/?page=2')}`)
    })

    it('元のパスにハッシュがある場合はredirectにハッシュも含める', () => {
      mockUseSession.mockReturnValue({ isLoggedIn: false, isLoading: false })

      const router = renderWithChild(['/?page=2#section'])

      expect(router.state.location.search).toBe(
        `?redirect=${encodeURIComponent('/?page=2#section')}`,
      )
    })
  })
})
