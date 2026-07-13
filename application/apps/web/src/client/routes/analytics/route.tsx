import type { MetaFunction } from 'react-router'
import { useAnalytics } from '@/client/features/diary'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import AnalyticsPage from './page'

export const meta: MetaFunction = ({ matches, location }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: '統計 | TrendDiary',
      description:
        '記事の読了状況を期間ごとに集計し、技術トレンドのキャッチアップ状況を確認できます。',
      path: location.pathname,
    }),
  )

export default function AnalyticsRoute() {
  const {
    selectedDate,
    summaryRange,
    weeklySummary,
    dailySummary,
    sources,
    reads,
    readPagination,
    isLoading,
    hasError,
    selectDate,
    clearSelectedDate,
    toNextPage,
    toPrevPage,
  } = useAnalytics()

  return (
    <AnalyticsPage
      selectedDate={selectedDate}
      summaryRange={summaryRange}
      weeklySummary={weeklySummary}
      dailySummary={dailySummary}
      sources={sources}
      reads={reads}
      readPagination={readPagination}
      isLoading={isLoading}
      hasError={hasError}
      onSelectDate={selectDate}
      onClearSelectedDate={clearSelectedDate}
      onNextPage={toNextPage}
      onPrevPage={toPrevPage}
    />
  )
}
