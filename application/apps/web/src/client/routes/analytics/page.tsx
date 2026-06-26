import { formatSummaryDateTick, toJaDateString, toJstDate } from '@trend-diary/common/locale/date'
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts'
import type { ChartConfig } from '@/client/components/shadcn/chart'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/client/components/shadcn/chart'
import LoginRequired from '@/client/components/ui/feedback/login-required'
import {
  DiaryPageLayout,
  DiaryReadListSection,
  DiaryReadPagination,
  DiarySummarySection,
  type ReadItem,
  type ReadPagination,
  type Source,
  type Summary,
} from '@/client/features/diary'

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
  isLoggedIn: boolean
  selectedDate: string | null
  dateResolveError: boolean
  summaryRange: SummaryRangePoint[]
  weeklySummary: Summary
  dailySummary: Summary
  sources: Source[]
  reads: ReadItem[]
  readPagination: ReadPagination
  isLoading: boolean
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
  isLoggedIn,
  selectedDate,
  dateResolveError,
  summaryRange,
  weeklySummary,
  dailySummary,
  sources,
  reads,
  readPagination,
  isLoading,
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

  if (!isLoggedIn) {
    return <LoginRequired pageTitle={pageTitle} />
  }

  return (
    <DiaryPageLayout pageTitle={pageTitle} dateResolveError={dateResolveError}>
      <div className='mt-5'>
        <h2 className='text-sm font-semibold text-gray-700'>グラフ</h2>
        <div
          className='mt-2 rounded-lg border border-gray-200 bg-white p-4'
          data-slot='diary-analytics'
        >
          <div className='flex min-h-8 items-center gap-2'>
            <p className='text-sm font-semibold text-gray-700'>
              選択日: {selectedDate ? toJaDateString(toJstDate(selectedDate)) : '未選択'}
            </p>
            {selectedDate && (
              <button
                type='button'
                onClick={onClearSelectedDate}
                className='w-24 rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-100'
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
              <Bar dataKey='read' fill='var(--color-read)' radius={4} className='cursor-pointer' />
              <Bar dataKey='skip' fill='var(--color-skip)' radius={4} className='cursor-pointer' />
            </BarChart>
          </ChartContainer>
        </div>
      </div>
      <DiarySummarySection sources={sources} displaySummary={displaySummary} />
      <DiaryReadListSection
        isLoading={isLoading}
        shouldShowDailyDetails={shouldShowDailyDetails}
        reads={reads}
        emptyState={
          shouldShowDailyDetails ? (
            <p className='mt-2 text-sm text-gray-500'>読了した記事はまだありません。</p>
          ) : (
            <p className='mt-2 text-sm text-gray-500'>
              グラフの日付をクリックすると、読了記事一覧を表示します。
            </p>
          )
        }
      />
      <DiaryReadPagination
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        readPagination={readPagination}
        shouldShowDailyDetails={shouldShowDailyDetails}
      />
    </DiaryPageLayout>
  )
}
