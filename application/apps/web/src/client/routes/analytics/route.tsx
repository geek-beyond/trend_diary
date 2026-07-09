import type { MetaFunction } from 'react-router'
import { useAnalytics } from '@/client/features/diary'
import AnalyticsPage from './page'

export const meta: MetaFunction = () => [{ title: '統計 | TrendDiary' }]

export default function AnalyticsRoute() {
  const {
    selectedDate,
    dateResolveError,
    summaryRange,
    weeklySummary,
    dailySummary,
    sources,
    reads,
    readPagination,
    isLoading,
    selectDate,
    clearSelectedDate,
    toNextPage,
    toPrevPage,
  } = useAnalytics()

  return (
    <AnalyticsPage
      selectedDate={selectedDate}
      dateResolveError={dateResolveError}
      summaryRange={summaryRange}
      weeklySummary={weeklySummary}
      dailySummary={dailySummary}
      sources={sources}
      reads={reads}
      readPagination={readPagination}
      isLoading={isLoading}
      onSelectDate={selectDate}
      onClearSelectedDate={clearSelectedDate}
      onNextPage={toNextPage}
      onPrevPage={toPrevPage}
    />
  )
}
