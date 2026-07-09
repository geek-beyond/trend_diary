import type { MetaFunction } from 'react-router'
import { useOutletContext } from 'react-router'
import { useDiary } from '@/client/features/diary'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import type { AppLayoutOutletContext } from '../app-layout'
import DiaryPage from './page'

export const meta: MetaFunction = ({ matches, location }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: 'ダイアリー | TrendDiary',
      description: '日ごとの読了記事を日記のように振り返って確認できます。',
      path: location.pathname,
    }),
  )

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
    hasError,
    retry,
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
      hasError={hasError}
      onRetry={retry}
      onNextPage={toNextPage}
      onPrevPage={toPrevPage}
    />
  )
}
