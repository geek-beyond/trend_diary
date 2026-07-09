import { render, screen } from '@testing-library/react'
import { createElement } from 'react'
import DiaryPage from './page'

interface Source {
  media: 'qiita' | 'zenn' | 'hatena'
  read: number
  skip: number
}

const sources: Source[] = [
  { media: 'qiita', read: 3, skip: 1 },
  { media: 'zenn', read: 2, skip: 0 },
  { media: 'hatena', read: 1, skip: 2 },
]

const reads = [
  {
    readHistoryId: 'rh-1',
    articleId: 'article-1',
    media: 'qiita' as const,
    title: '記事タイトル',
    url: 'https://example.com/articles/1',
    readAt: new Date('2026-03-08T10:30:00+09:00'),
  },
]

describe('DiaryPage', () => {
  it('対象日と読了一覧を表示する', () => {
    render(
      createElement(DiaryPage, {
        targetDate: '2026-03-08',
        dateResolveError: false,
        dailySummary: { read: 6, skip: 3 },
        sources,
        reads,
        readPagination: { page: 1, totalPages: 2, hasNext: true, hasPrev: false },
        isLoading: false,
        onNextPage: vi.fn(),
        onPrevPage: vi.fn(),
      }),
    )

    expect(screen.getByRole('heading', { name: 'ダイアリー' })).toBeInTheDocument()
    expect(screen.getByText(/対象日:/)).toBeInTheDocument()
    expect(screen.getByText('記事タイトル')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '記事タイトル' })).toHaveAttribute(
      'href',
      'https://example.com/articles/1',
    )
    expect(screen.getByText('はてブ')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('読了記事URLがhttp/https以外ならリンク表示しない', () => {
    render(
      createElement(DiaryPage, {
        targetDate: '2026-03-08',
        dateResolveError: false,
        dailySummary: { read: 1, skip: 0 },
        sources,
        reads: [
          {
            readHistoryId: 'rh-danger',
            articleId: 'article-danger',
            media: 'zenn',
            title: '危険なURL記事',
            url: 'javascript:alert(1)',
            readAt: new Date('2026-03-08T12:00:00+09:00'),
          },
        ],
        readPagination: { page: 1, totalPages: 1, hasNext: false, hasPrev: false },
        isLoading: false,
        onNextPage: vi.fn(),
        onPrevPage: vi.fn(),
      }),
    )

    expect(screen.getByText('危険なURL記事')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '危険なURL記事' })).not.toBeInTheDocument()
  })

  it('日付解決に失敗したときはエラーメッセージを表示する', () => {
    render(
      createElement(DiaryPage, {
        targetDate: null,
        dateResolveError: true,
        dailySummary: { read: 0, skip: 0 },
        sources,
        reads: [],
        readPagination: { page: 1, totalPages: 0, hasNext: false, hasPrev: false },
        isLoading: false,
        onNextPage: vi.fn(),
        onPrevPage: vi.fn(),
      }),
    )

    expect(
      screen.getByText('JST日付の解決に失敗した。時間をおいて再読み込みして。'),
    ).toBeInTheDocument()
  })
})
