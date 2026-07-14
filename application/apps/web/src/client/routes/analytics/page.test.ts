import { fireEvent, render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { createElement } from 'react'
import AnalyticsPage from './page'

vi.mock('recharts', () => ({
  BarChart: ({
    children,
    onClick,
  }: {
    children: ReactNode
    onClick?: (state: { activeLabel?: string }) => void
  }) =>
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

describe('AnalyticsPage', () => {
  it('日付未選択時は週次集計を表示し、一覧は案内文を表示する', () => {
    render(
      createElement(AnalyticsPage, {
        selectedDate: null,
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
        hasError: false,
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
        selectedDate: '2026-03-08',
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
        hasError: false,
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

  it('取得エラー時はグラフや一覧を表示しない（エラーの案内と再試行はトーストに集約する）', () => {
    render(
      createElement(AnalyticsPage, {
        selectedDate: '2026-03-08',
        summaryRange: [{ date: '2026-03-08', read: 2, skip: 1 }],
        weeklySummary: { read: 20, skip: 7 },
        dailySummary: { read: 3, skip: 1 },
        sources,
        reads,
        readPagination: { page: 2, totalPages: 3, hasNext: true, hasPrev: true },
        isLoading: false,
        hasError: true,
        onSelectDate: vi.fn(),
        onClearSelectedDate: vi.fn(),
        onNextPage: vi.fn(),
        onPrevPage: vi.fn(),
      }),
    )

    expect(screen.queryByTestId('analytics-chart')).not.toBeInTheDocument()
    expect(screen.queryByText('記事タイトル')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '再試行' })).not.toBeInTheDocument()
  })

  it('取得エラー時でも再取得中はエラー表示ではなく通常のグラフ・一覧表示にする', () => {
    render(
      createElement(AnalyticsPage, {
        selectedDate: '2026-03-08',
        summaryRange: [{ date: '2026-03-08', read: 2, skip: 1 }],
        weeklySummary: { read: 20, skip: 7 },
        dailySummary: { read: 3, skip: 1 },
        sources,
        reads,
        readPagination: { page: 2, totalPages: 3, hasNext: true, hasPrev: true },
        isLoading: true,
        hasError: true,
        onSelectDate: vi.fn(),
        onClearSelectedDate: vi.fn(),
        onNextPage: vi.fn(),
        onPrevPage: vi.fn(),
      }),
    )

    expect(
      screen.queryByText('エラーが発生しました。時間をおいて再度お試しください。'),
    ).not.toBeInTheDocument()
    expect(screen.getByTestId('analytics-chart')).toBeInTheDocument()
  })
})
