import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import ProtectedLayout from './protected-layout'

vi.mock('@/client/entities/auth', () => ({
  useSession: vi.fn(),
}))

const { useSession } = await import('@/client/entities/auth')
const mockUseSession = vi.mocked(useSession)

function renderWithChild() {
  const router = createMemoryRouter(
    [
      {
        element: createElement(ProtectedLayout),
        children: [{ index: true, element: createElement('div', null, '保護ページ本体') }],
      },
    ],
    { initialEntries: ['/'] },
  )

  render(createElement(RouterProvider, { router }))
}

describe('ProtectedLayout', () => {
  it.each([
    {
      scenario: 'セッション確定前',
      session: { isLoggedIn: false, isLoading: true },
      isLoadingView: true,
    },
    {
      scenario: 'セッション確定後',
      session: { isLoggedIn: true, isLoading: false },
      isLoadingView: false,
    },
  ])(
    '$scenario はローディング表示=$isLoadingView で配下ページの描画を出し分ける',
    ({ session, isLoadingView }) => {
      mockUseSession.mockReturnValue(session)

      renderWithChild()

      expect(screen.queryByRole('status', { name: '読み込み中' }) !== null).toBe(isLoadingView)
      expect(screen.queryByText('保護ページ本体') !== null).toBe(!isLoadingView)
    },
  )
})
