import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import AnalyticsPage from './analytics-page'
import DiaryPage from './page'

vi.mock('recharts', () => ({
  BarChart: ({ children, onClick }: { children: ReactNode; onClick?: (state: unknown) => void }) =>
    createElement(
      'button',
      {
        type: 'button',
        'data-testid': 'analytics-chart',
        onClick: () => onClick?.({ activeLabel: '2026-03-07' }),
      },
      children,
    ),
  Bar: () => createElement('div', { 'data-testid': 'analytics-bar' }),
  CartesianGrid: () => createElement('div'),
  XAxis: () => createElement('div'),
}))

vi.mock('@/client/components/shadcn/chart', () => ({
  ChartContainer: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  ChartLegend: () => createElement('div'),
  ChartLegendContent: () => createElement('div'),
  ChartTooltip: () => createElement('div'),
  ChartTooltipContent: () => createElement('div'),
}))

type Source = {
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
  it('未ログイン時は利用制限メッセージのみ表示する', () => {
    render(
      createElement(DiaryPage, {
        isLoggedIn: false,
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
    expect(screen.getByText('この機能はログイン時のみ利用できます。')).toBeInTheDocument()
  })

  it('ログイン時は対象日と読了一覧を表示する', () => {
    render(
      createElement(DiaryPage, {
        isLoggedIn: true,
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
        isLoggedIn: true,
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
        isLoggedIn: true,
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

describe('AnalyticsPage', () => {
  it('日付未選択時は週次集計を表示し、一覧は案内文を表示する', () => {
    render(
      createElement(AnalyticsPage, {
        isLoggedIn: true,
        selectedDate: null,
        dateResolveError: false,
        summaryRange: [
          { date: '2026-03-07', read: 1, skip: 0 },
          { date: '2026-03-08', read: 2, skip: 1 },
        ],
        weeklySummary: { read: 20, skip: 7 },
        dailySummary: { read: 3, skip: 1 },
        sources,
        reads: [],
        readPagination: { page: 1, totalPages: 0, hasNext: false, hasPrev: false },
        isLoading: false,
        onSelectDate: vi.fn(),
        onClearSelectedDate: vi.fn(),
        onNextPage: vi.fn(),
        onPrevPage: vi.fn(),
      }),
    )

    expect(screen.getByRole('heading', { name: '統計' })).toBeInTheDocument()
    expect(screen.getByText('20件')).toBeInTheDocument()
    expect(
      screen.getByText('グラフの日付をクリックすると、読了記事一覧を表示します。'),
    ).toBeInTheDocument()
    expect(screen.getByText('- / -')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '前へ' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '次へ' })).toBeDisabled()
  })

  it('日付選択時は日次集計と読了一覧を表示し、チャートクリックで日付選択する', () => {
    const onSelectDate = vi.fn()
    const onClearSelectedDate = vi.fn()

    render(
      createElement(AnalyticsPage, {
        isLoggedIn: true,
        selectedDate: '2026-03-08',
        dateResolveError: false,
        summaryRange: [
          { date: '2026-03-07', read: 1, skip: 0 },
          { date: '2026-03-08', read: 2, skip: 1 },
        ],
        weeklySummary: { read: 20, skip: 7 },
        dailySummary: { read: 3, skip: 1 },
        sources,
        reads,
        readPagination: { page: 2, totalPages: 3, hasNext: true, hasPrev: true },
        isLoading: false,
        onSelectDate,
        onClearSelectedDate,
        onNextPage: vi.fn(),
        onPrevPage: vi.fn(),
      }),
    )

    fireEvent.click(screen.getByTestId('analytics-chart'))
    fireEvent.click(screen.getByRole('button', { name: '選択をクリア' }))

    expect(onSelectDate).toHaveBeenCalledWith('2026-03-07')
    expect(onClearSelectedDate).toHaveBeenCalledTimes(1)
    expect(screen.getByText('記事タイトル')).toBeInTheDocument()
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(screen.getAllByText('3件').length).toBeGreaterThanOrEqual(1)
  })

  it('日付解決に失敗したときはエラーメッセージを表示する', () => {
    render(
      createElement(AnalyticsPage, {
        isLoggedIn: true,
        selectedDate: null,
        dateResolveError: true,
        summaryRange: [],
        weeklySummary: { read: 0, skip: 0 },
        dailySummary: { read: 0, skip: 0 },
        sources,
        reads: [],
        readPagination: { page: 1, totalPages: 0, hasNext: false, hasPrev: false },
        isLoading: false,
        onSelectDate: vi.fn(),
        onClearSelectedDate: vi.fn(),
        onNextPage: vi.fn(),
        onPrevPage: vi.fn(),
      }),
    )

    expect(
      screen.getByText('JST日付の解決に失敗した。時間をおいて再読み込みして。'),
    ).toBeInTheDocument()
  })
})
