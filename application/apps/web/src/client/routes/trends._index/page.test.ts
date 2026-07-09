import { fireEvent, render, screen } from '@testing-library/react'
import { type ComponentProps, createElement } from 'react'
import type { Article } from '@/client/features/article'
import TrendsPage from './page'

// FilterPanel が参照する matchMedia を jsdom 向けに補う
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

type TrendsPageProps = ComponentProps<typeof TrendsPage>

const buildArticle = (overrides: Partial<Article> = {}): Article => ({
  articleId: 'a1',
  media: 'qiita',
  title: 'テスト記事タイトル',
  author: 'テスト著者',
  description: 'テスト記事の説明文です',
  url: 'https://example.com/a1',
  createdAt: new Date('2026-03-01T00:00:00.000Z'),
  ...overrides,
})

const buildProps = (overrides: Partial<TrendsPageProps> = {}): TrendsPageProps => ({
  date: new Date('2026-03-01T00:00:00.000Z'),
  articles: [],
  openDrawer: vi.fn(),
  isLoading: false,
  hasError: false,
  onRetry: vi.fn(),
  page: 1,
  totalPages: 1,
  selectedMedia: undefined,
  selectedReadStatus: 'all',
  selectedDatePreset: 'today',
  toNextPage: vi.fn(),
  toPreviousPage: vi.fn(),
  onApplyFilters: vi.fn(),
  onToggleRead: vi.fn(),
  isLoggedIn: false,
  ...overrides,
})

describe('TrendsPage', () => {
  it('読み込み中は記事カード型のスケルトンを表示し空文言を表示しない', () => {
    render(createElement(TrendsPage, buildProps({ isLoading: true })))

    expect(screen.getByRole('status', { name: '記事を読み込み中' })).toBeInTheDocument()
    expect(screen.getAllByTestId('article-card-skeleton').length).toBeGreaterThan(0)
    expect(screen.queryByText('記事がありません')).not.toBeInTheDocument()
  })

  it('読み込み完了かつ記事があるときは記事カードとページネーションを表示する', () => {
    render(createElement(TrendsPage, buildProps({ articles: [buildArticle()], totalPages: 2 })))

    expect(screen.getByText('テスト記事タイトル')).toBeInTheDocument()
    expect(screen.getByText('ページ 1 / 2')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: '記事を読み込み中' })).not.toBeInTheDocument()
  })

  it('読み込み完了かつ記事が0件のときは空文言を表示する', () => {
    render(createElement(TrendsPage, buildProps({ articles: [] })))

    expect(screen.getByText('記事がありません')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: '記事を読み込み中' })).not.toBeInTheDocument()
  })

  it('記事が0件でもフィルタ未適用のときはフィルタ解除ボタンを表示しない', () => {
    render(createElement(TrendsPage, buildProps({ articles: [] })))

    expect(screen.queryByRole('button', { name: 'フィルタを解除する' })).not.toBeInTheDocument()
  })

  it('記事が0件でフィルタ適用中のときはフィルタ解除ボタンを表示し、押すとフィルタが初期値に戻る', () => {
    const onApplyFilters = vi.fn()
    render(
      createElement(
        TrendsPage,
        buildProps({ articles: [], selectedMedia: 'qiita', onApplyFilters }),
      ),
    )

    const resetButton = screen.getByRole('button', { name: 'フィルタを解除する' })
    fireEvent.click(resetButton)

    expect(onApplyFilters).toHaveBeenCalledWith({
      media: undefined,
      readStatus: 'all',
      datePreset: 'today',
    })
  })

  it('取得エラー時は再試行ボタン付きのエラー表示をし記事一覧を表示しない', () => {
    const onRetry = vi.fn()
    render(
      createElement(
        TrendsPage,
        buildProps({ hasError: true, articles: [buildArticle()], onRetry }),
      ),
    )

    expect(
      screen.getByText('エラーが発生しました。時間をおいて再度お試しください。'),
    ).toBeInTheDocument()
    expect(screen.queryByText('テスト記事タイトル')).not.toBeInTheDocument()
    expect(screen.queryByText('記事がありません')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '再試行' }))
    expect(onRetry).toHaveBeenCalledTimes(1)
  })
})
