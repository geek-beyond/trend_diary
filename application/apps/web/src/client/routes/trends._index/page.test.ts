import { fireEvent, render, screen } from '@testing-library/react'
import { type ComponentProps, createElement } from 'react'
import { ALL_MEDIA, type Article } from '@/client/features/article'
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
  page: 1,
  totalPages: 1,
  selectedMedia: ALL_MEDIA,
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
        buildProps({ articles: [], selectedMedia: ['qiita'], onApplyFilters }),
      ),
    )

    const resetButton = screen.getByRole('button', { name: 'フィルタを解除する' })
    fireEvent.click(resetButton)

    expect(onApplyFilters).toHaveBeenCalledWith({
      media: ALL_MEDIA,
      readStatus: 'all',
      datePreset: 'today',
    })
  })

  it('取得エラー時は記事一覧を表示しない（エラーの案内と再試行はトーストに集約する）', () => {
    render(createElement(TrendsPage, buildProps({ hasError: true, articles: [buildArticle()] })))

    expect(screen.queryByText('テスト記事タイトル')).not.toBeInTheDocument()
    expect(screen.queryByText('記事がありません')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '再試行' })).not.toBeInTheDocument()
  })

  // ページ送りは遷移リンクではなくクリック操作のため、ユーザー補助ツリー上も button ロールで露出させ aria 属性の不整合を避ける
  describe('ページネーション', () => {
    it('前へ・次へは button ロールで公開される', () => {
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 2, totalPages: 3 }),
        ),
      )

      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeInTheDocument()
    })

    it('先頭ページでは前へが無効・次へが有効になる', () => {
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 1, totalPages: 3 }),
        ),
      )

      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeEnabled()
    })

    it('最終ページでは次へが無効・前へが有効になる', () => {
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 3, totalPages: 3 }),
        ),
      )

      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeEnabled()
    })

    it('次へを押すと次ページへ遷移する', () => {
      const toNextPage = vi.fn()
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 1, totalPages: 3, toNextPage }),
        ),
      )

      fireEvent.click(screen.getByRole('button', { name: 'Go to next page' }))

      expect(toNextPage).toHaveBeenCalledWith(1)
    })

    it('前へを押すと前ページへ遷移する', () => {
      const toPreviousPage = vi.fn()
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 2, totalPages: 3, toPreviousPage }),
        ),
      )

      fireEvent.click(screen.getByRole('button', { name: 'Go to previous page' }))

      expect(toPreviousPage).toHaveBeenCalledWith(2)
    })
  })
})
