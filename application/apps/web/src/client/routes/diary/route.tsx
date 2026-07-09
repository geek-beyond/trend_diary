import type { MetaFunction } from 'react-router'
import { useDiary } from '@/client/features/diary'
import DiaryPage from './page'

export const meta: MetaFunction = () => [{ title: 'ダイアリー | TrendDiary' }]

export default function DiaryRoute() {
  const {
    todayJst,
    dateResolveError,
    dailySummary,
    sources,
    reads,
    readPagination,
    isLoading,
    toNextPage,
    toPrevPage,
  } = useDiary()

  return (
    <DiaryPage
      targetDate={todayJst}
      dateResolveError={dateResolveError}
      dailySummary={dailySummary}
      sources={sources}
      reads={reads}
      readPagination={readPagination}
      isLoading={isLoading}
      onNextPage={toNextPage}
      onPrevPage={toPrevPage}
    />
  )
}
