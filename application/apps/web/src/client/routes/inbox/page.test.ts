import { render, screen } from '@testing-library/react'
import { type ComponentProps, createElement } from 'react'
import { MemoryRouter } from 'react-router'
import { ALL_MEDIA } from '@/client/features/article'
import InboxPage from './page'

type InboxPageProps = ComponentProps<typeof InboxPage>
type InboxArticle = NonNullable<InboxPageProps['article']>

function renderInboxPage(props: InboxPageProps) {
  return render(createElement(MemoryRouter, null, createElement(InboxPage, props)))
}

const buildProps = (overrides: Partial<InboxPageProps> = {}): InboxPageProps => ({
  article: null,
  isLoading: false,
  hasError: false,
  isJustCompleted: false,
  onSkip: vi.fn().mockResolvedValue(undefined),
  onRead: vi.fn().mockResolvedValue(undefined),
  onLater: vi.fn(),
  remainingCount: 0,
  selectedMedia: ALL_MEDIA,
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
    renderInboxPage(buildProps({ isJustCompleted: true }))

    expect(screen.getByText('消化完了')).toBeInTheDocument()
    expect(screen.queryByText('未読を消化しきった。')).not.toBeInTheDocument()
    expect(screen.queryByText('未読記事はありません')).not.toBeInTheDocument()
  })

  it('通常の0件状態では達成カードを表示しない', () => {
    renderInboxPage(buildProps())

    expect(screen.getByText('未読記事はありません')).toBeInTheDocument()
    expect(screen.queryByText('消化完了')).not.toBeInTheDocument()
  })

  it('読み込み中はスケルトンを表示し本文を表示しない', () => {
    renderInboxPage(buildProps({ isLoading: true, remainingCount: 3 }))

    expect(screen.getByRole('status', { name: '読み込み中' })).toBeInTheDocument()
    expect(screen.getByText('残り 3 件')).toBeInTheDocument()
    expect(screen.queryByText('未読記事はありません')).not.toBeInTheDocument()
  })

  it('未読記事があるとタイトル・著者・本文と操作ボタンを表示する', () => {
    renderInboxPage(buildProps({ article: buildArticle(), remainingCount: 1 }))

    expect(screen.getByText('テスト記事タイトル')).toBeInTheDocument()
    expect(screen.getByText('著者: テスト著者')).toBeInTheDocument()
    expect(screen.getByText('テスト記事の説明文です')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'スキップ' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '読む' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '後で' })).toBeInTheDocument()
  })

  it('取得エラー時は本文を表示しない（エラーの案内と再試行はトーストに集約する）', () => {
    renderInboxPage(buildProps({ hasError: true, remainingCount: 3 }))

    expect(screen.queryByText('未読記事はありません')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '再試行' })).not.toBeInTheDocument()
  })

  it('取得エラー時でも再取得中はスケルトンを表示する', () => {
    renderInboxPage(buildProps({ hasError: true, isLoading: true, remainingCount: 3 }))

    expect(screen.getByRole('status', { name: '読み込み中' })).toBeInTheDocument()
    expect(screen.queryByText('未読記事はありません')).not.toBeInTheDocument()
  })

  it('通常の0件状態ではトレンド一覧への導線を表示する', () => {
    renderInboxPage(buildProps())

    expect(screen.getByRole('link', { name: 'トレンド一覧へ' })).toBeInTheDocument()
  })

  it('完了直後はトレンド一覧への導線を表示する', () => {
    renderInboxPage(buildProps({ isJustCompleted: true }))

    expect(screen.getByRole('link', { name: 'トレンド一覧へ' })).toBeInTheDocument()
  })
})
