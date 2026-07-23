import { toJstDate } from '@trend-diary/std/locale/date'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import type { ChartConfig } from '@/client/components/shadcn/chart'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/client/components/shadcn/chart'
import PageCard from '@/client/components/ui/layout/page-card'
import {
  DiaryReadListSection,
  DiaryReadPagination,
  DiarySummarySection,
  type ReadItem,
  type ReadPagination,
  type Source,
  type Summary,
} from '@/client/features/diary'
import { formatSummaryDateTick, toJaDateString } from '@/common/locale/date'

interface SummaryRangePoint {
  date: string
  read: number
  skip: number
}

// recharts v3の onClick(state) では activeLabel が string | number になりうる
type ChartClickState = {
  activeLabel?: string | number
} | null

interface Props {
  selectedDate: string | null
  summaryRange: SummaryRangePoint[]
  weeklySummary: Summary
  dailySummary: Summary
  sources: Source[]
  reads: ReadItem[]
  readPagination: ReadPagination
  isLoading: boolean
  hasError: boolean
  onSelectDate: (date: string) => void
  onClearSelectedDate: () => void
  onNextPage: () => void
  onPrevPage: () => void
}

const chartConfig = {
  read: {
    label: '読了',
    color: '#3b82f6',
  },
  skip: {
    label: 'スキップ',
    color: '#64748b',
  },
} satisfies ChartConfig

export default function AnalyticsPage({
  selectedDate,
  summaryRange,
  weeklySummary,
  dailySummary,
  sources,
  reads,
  readPagination,
  isLoading,
  hasError,
  onSelectDate,
  onClearSelectedDate,
  onNextPage,
  onPrevPage,
}: Props) {
  const pageTitle = '統計'
  const displaySummary = selectedDate === null ? weeklySummary : dailySummary
  const shouldShowDailyDetails = selectedDate !== null

  const handleChartClick = (state: ChartClickState) => {
    if (typeof state?.activeLabel === 'string') {
      onSelectDate(state.activeLabel)
    }
  }

  return (
    <PageCard title={pageTitle}>
      {/* 取得エラー時は誤解を招く空表示を避けるため本文を出さない。エラーの案内と再試行はトーストに集約する */}
      {hasError && !isLoading ? null : (
        <>
          <div className='mt-5'>
            <h2 className='text-sm font-semibold text-foreground'>グラフ</h2>
            <div
              className='mt-2 rounded-lg border border-border bg-card p-4'
              data-slot='diary-analytics'
            >
              <div className='flex min-h-8 items-center gap-2'>
                <p className='text-sm font-semibold text-foreground'>
                  選択日: {selectedDate ? toJaDateString(toJstDate(selectedDate)) : '未選択'}
                </p>
                {selectedDate && (
                  <button
                    type='button'
                    onClick={onClearSelectedDate}
                    className='w-24 rounded border border-border bg-card px-2 py-1 text-xs text-foreground hover:bg-muted'
                    data-slot='diary-clear-selected-date'
                  >
                    選択をクリア
                  </button>
                )}
              </div>
              <ChartContainer config={chartConfig} className='mt-3 h-56 w-full'>
                <BarChart data={summaryRange} onClick={handleChartClick}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey='date'
                    tickLine={false}
                    tickMargin={8}
                    axisLine={false}
                    tickFormatter={formatSummaryDateTick}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar
                    dataKey='read'
                    fill='var(--color-read)'
                    radius={4}
                    className='cursor-pointer'
                  />
                  <Bar
                    dataKey='skip'
                    fill='var(--color-skip)'
                    radius={4}
                    className='cursor-pointer'
                  />
                </BarChart>
              </ChartContainer>
            </div>
          </div>
          <DiarySummarySection sources={sources} displaySummary={displaySummary} />
          <DiaryReadListSection
            isLoading={isLoading}
            shouldShowDailyDetails={shouldShowDailyDetails}
            reads={reads}
          />
          <DiaryReadPagination
            onNextPage={onNextPage}
            onPrevPage={onPrevPage}
            readPagination={readPagination}
            shouldShowDailyDetails={shouldShowDailyDetails}
          />
        </>
      )}
    </PageCard>
  )
}
