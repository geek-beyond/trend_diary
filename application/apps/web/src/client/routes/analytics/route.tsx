import type { MetaFunction } from 'react-router'
import { useOutletContext } from 'react-router'
import { useAnalytics } from '@/client/features/diary'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import type { AppLayoutOutletContext } from '../app-layout'
import AnalyticsPage from './page'

export const meta: MetaFunction = ({ matches }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: '統計 | TrendDiary',
      description:
        '記事の読了状況を期間ごとに集計し、技術トレンドのキャッチアップ状況を確認できます。',
      path: '/analytics',
    }),
  )

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
