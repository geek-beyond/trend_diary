import { fireEvent, render, screen } from '@testing-library/react'
import { type ComponentProps, createElement } from 'react'
import { ALL_MEDIA, type Article } from '@/client/features/article'
import TrendsPage from './page'

// ページ送りクリックで呼ばれる scrollToTop（window.scrollTo）を jsdom 向けに補う
Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() })

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
  prevPageHref: '/trends',
  nextPageHref: '/trends?page=2',
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

  // 検索エンジンがページ送りをたどれるよう、遷移可能な前へ・次へは href を持つリンク（link ロール）で公開する。
  // 遷移先の無い無効状態は button（disabled）で公開し、href 無しの <a> による aria 属性の不整合を避ける
  describe('ページネーション', () => {
    it('遷移可能な前へ・次へは遷移先の href を持つ link ロールで公開される', () => {
      render(
        createElement(
          TrendsPage,
          buildProps({
            articles: [buildArticle()],
            page: 2,
            totalPages: 3,
            prevPageHref: '/trends',
            nextPageHref: '/trends?page=3',
          }),
        ),
      )

      expect(screen.getByRole('link', { name: 'Go to previous page' })).toHaveAttribute(
        'href',
        '/trends',
      )
      expect(screen.getByRole('link', { name: 'Go to next page' })).toHaveAttribute(
        'href',
        '/trends?page=3',
      )
    })

    it('先頭ページでは前へが無効な button・次へが遷移可能な link になる', () => {
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 1, totalPages: 3 }),
        ),
      )

      expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeDisabled()
      expect(screen.getByRole('link', { name: 'Go to next page' })).toBeInTheDocument()
    })

    it('最終ページでは次へが無効な button・前へが遷移可能な link になる', () => {
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 3, totalPages: 3 }),
        ),
      )

      expect(screen.getByRole('button', { name: 'Go to next page' })).toBeDisabled()
      expect(screen.getByRole('link', { name: 'Go to previous page' })).toBeInTheDocument()
    })

    it('次へを押すと既定挙動を抑止して次ページへ SPA 遷移する', () => {
      const toNextPage = vi.fn()
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 1, totalPages: 3, toNextPage }),
        ),
      )

      const nextLink = screen.getByRole('link', { name: 'Go to next page' })
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      fireEvent(nextLink, clickEvent)

      expect(toNextPage).toHaveBeenCalledWith(1)
      expect(clickEvent.defaultPrevented).toBe(true)
    })

    it('前へを押すと既定挙動を抑止して前ページへ SPA 遷移する', () => {
      const toPreviousPage = vi.fn()
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 2, totalPages: 3, toPreviousPage }),
        ),
      )

      const prevLink = screen.getByRole('link', { name: 'Go to previous page' })
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true })
      fireEvent(prevLink, clickEvent)

      expect(toPreviousPage).toHaveBeenCalledWith(2)
      expect(clickEvent.defaultPrevented).toBe(true)
    })

    it('修飾キー付きクリックはブラウザ標準挙動に任せ SPA 遷移へ差し替えない', () => {
      const toNextPage = vi.fn()
      render(
        createElement(
          TrendsPage,
          buildProps({ articles: [buildArticle()], page: 1, totalPages: 3, toNextPage }),
        ),
      )

      const nextLink = screen.getByRole('link', { name: 'Go to next page' })
      const clickEvent = new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
        metaKey: true,
      })
      fireEvent(nextLink, clickEvent)

      expect(toNextPage).not.toHaveBeenCalled()
      expect(clickEvent.defaultPrevented).toBe(false)
    })
  })
})
