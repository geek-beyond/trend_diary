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
  it('セッション確定前はローディングを表示し配下ページを描画しない', () => {
    mockUseSession.mockReturnValue({ isLoggedIn: false, isLoading: true })

    renderWithChild()

    expect(screen.getByRole('status', { name: '読み込み中' })).toBeInTheDocument()
    expect(screen.queryByText('保護ページ本体')).not.toBeInTheDocument()
  })

  it('セッション確定後はローディングを出さず配下ページを描画する', () => {
    mockUseSession.mockReturnValue({ isLoggedIn: true, isLoading: false })

    renderWithChild()

    expect(screen.getByText('保護ページ本体')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: '読み込み中' })).not.toBeInTheDocument()
  })
})
