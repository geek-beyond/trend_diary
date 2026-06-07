import type { MetaFunction } from 'react-router'
import { useOutletContext } from 'react-router'
import type { AppLayoutOutletContext } from '../app-layout'
import useDiary from './hooks/use-diary'
import DiaryPage from './page'

export const meta: MetaFunction = () => [{ title: 'ダイアリー | TrendDiary' }]

export default function DiaryRoute() {
  const { isLoggedIn } = useOutletContext<AppLayoutOutletContext>()
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
  } = useDiary(isLoggedIn)

  return (
    <DiaryPage
      isLoggedIn={isLoggedIn}
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
