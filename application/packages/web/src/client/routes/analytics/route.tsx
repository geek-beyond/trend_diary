import type { MetaFunction } from 'react-router'
import { useOutletContext } from 'react-router'
import type { AppLayoutOutletContext } from '../app-layout'
import AnalyticsPage from '../diary/analytics-page'
import useAnalytics from '../diary/hooks/use-analytics'

export const meta: MetaFunction = () => [{ title: '統計 | TrendDiary' }]

export default function AnalyticsRoute() {
  const { isLoggedIn } = useOutletContext<AppLayoutOutletContext>()
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
  } = useAnalytics(isLoggedIn)

  return (
    <AnalyticsPage
      isLoggedIn={isLoggedIn}
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
