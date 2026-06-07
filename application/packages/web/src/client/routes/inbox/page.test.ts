import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import InboxPage from './page'

describe('InboxPage', () => {
  it('完了直後は達成カードを表示して通常の0件文言は表示しない', () => {
    render(
      createElement(InboxPage, {
        article: null,
        isLoading: false,
        isJustCompleted: true,
        isLoggedIn: true,
        onSkip: vi.fn().mockResolvedValue(undefined),
        onRead: vi.fn().mockResolvedValue(undefined),
        onLater: vi.fn(),
        remainingCount: 0,
        selectedMedia: null,
        onMediaChange: vi.fn(),
      }),
    )

    expect(screen.getByText('消化完了')).toBeInTheDocument()
    expect(screen.queryByText('未読を消化しきった。')).not.toBeInTheDocument()
    expect(screen.queryByText('未読記事はありません')).not.toBeInTheDocument()
  })

  it('通常の0件状態では達成カードを表示しない', () => {
    render(
      createElement(InboxPage, {
        article: null,
        isLoading: false,
        isJustCompleted: false,
        isLoggedIn: true,
        onSkip: vi.fn().mockResolvedValue(undefined),
        onRead: vi.fn().mockResolvedValue(undefined),
        onLater: vi.fn(),
        remainingCount: 0,
        selectedMedia: null,
        onMediaChange: vi.fn(),
      }),
    )

    expect(screen.getByText('未読記事はありません')).toBeInTheDocument()
    expect(screen.queryByText('消化完了')).not.toBeInTheDocument()
  })
})
