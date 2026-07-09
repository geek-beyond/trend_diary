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
      scenario: 'セッション確定前は配下ページを描画しない',
      session: { isLoggedIn: false, isLoading: true },
      childVisible: false,
    },
    {
      scenario: 'セッション確定後は配下ページを描画する',
      session: { isLoggedIn: true, isLoading: false },
      childVisible: true,
    },
  ])('$scenario', ({ session, childVisible }) => {
    mockUseSession.mockReturnValue(session)

    renderWithChild()

    expect(screen.queryByText('保護ページ本体') !== null).toBe(childVisible)
  })
})
