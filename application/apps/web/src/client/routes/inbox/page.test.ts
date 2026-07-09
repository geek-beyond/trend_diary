import { render, screen } from '@testing-library/react'
import { type ComponentProps, createElement } from 'react'
import InboxPage from './page'

type InboxPageProps = ComponentProps<typeof InboxPage>
type InboxArticle = NonNullable<InboxPageProps['article']>

const buildProps = (overrides: Partial<InboxPageProps> = {}): InboxPageProps => ({
  article: null,
  isLoading: false,
  isJustCompleted: false,
  isLoggedIn: true,
  isSessionLoading: false,
  onSkip: vi.fn().mockResolvedValue(undefined),
  onRead: vi.fn().mockResolvedValue(undefined),
  onLater: vi.fn(),
  remainingCount: 0,
  selectedMedia: undefined,
  onMediaChange: vi.fn(),
  ...overrides,
})

const buildArticle = (overrides: Partial<InboxArticle> = {}): InboxArticle => ({
  articleId: 'a1',
  media: 'qiita',
  title: 'テスト記事タイトル',
  author: 'テスト著者',
  description: 'テスト記事の説明文です',
  url: 'https://example.com/a1',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
})

describe('InboxPage', () => {
  it('完了直後は達成カードを表示して通常の0件文言は表示しない', () => {
    render(createElement(InboxPage, buildProps({ isJustCompleted: true })))

    expect(screen.getByText('消化完了')).toBeInTheDocument()
    expect(screen.queryByText('未読を消化しきった。')).not.toBeInTheDocument()
    expect(screen.queryByText('未読記事はありません')).not.toBeInTheDocument()
  })

  it('通常の0件状態では達成カードを表示しない', () => {
    render(createElement(InboxPage, buildProps()))

    expect(screen.getByText('未読記事はありません')).toBeInTheDocument()
    expect(screen.queryByText('消化完了')).not.toBeInTheDocument()
  })

  it('未ログイン時はログイン要求のみを表示し本文を表示しない', () => {
    render(createElement(InboxPage, buildProps({ isLoggedIn: false })))

    expect(screen.getByText('この機能はログイン時のみ利用できます。')).toBeInTheDocument()
    expect(screen.queryByText('未読記事はありません')).not.toBeInTheDocument()
  })

  it('セッション確定前はローディングを表示しログイン要求を表示しない', () => {
    render(createElement(InboxPage, buildProps({ isLoggedIn: false, isSessionLoading: true })))

    expect(screen.getByRole('status', { name: '読み込み中' })).toBeInTheDocument()
    expect(screen.queryByText('この機能はログイン時のみ利用できます。')).not.toBeInTheDocument()
    expect(screen.queryByText('未読記事はありません')).not.toBeInTheDocument()
  })

  it('読み込み中は読み込み文言を表示し本文を表示しない', () => {
    render(createElement(InboxPage, buildProps({ isLoading: true, remainingCount: 3 })))

    expect(screen.getByText('読み込み中...')).toBeInTheDocument()
    expect(screen.getByText('残り 3 件')).toBeInTheDocument()
    expect(screen.queryByText('未読記事はありません')).not.toBeInTheDocument()
  })

  it('未読記事があるとタイトル・著者・本文と操作ボタンを表示する', () => {
    render(createElement(InboxPage, buildProps({ article: buildArticle(), remainingCount: 1 })))

    expect(screen.getByText('テスト記事タイトル')).toBeInTheDocument()
    expect(screen.getByText('著者: テスト著者')).toBeInTheDocument()
    expect(screen.getByText('テスト記事の説明文です')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'スキップ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '読む' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '後で' })).toBeInTheDocument()
  })

  it('未知のメディアの記事でもタイトルを表示できる', () => {
    const article = buildArticle({
      articleId: 'a2',
      media: 'unknown',
      title: '未知メディアの記事',
      url: 'https://example.com/a2',
    })
    render(createElement(InboxPage, buildProps({ article, remainingCount: 1 })))

    expect(screen.getByText('未知メディアの記事')).toBeInTheDocument()
  })
})
