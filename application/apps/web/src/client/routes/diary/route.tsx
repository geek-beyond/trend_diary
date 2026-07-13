import type { MetaFunction } from 'react-router'
import { useDiary } from '@/client/features/diary'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
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
  const {
    todayJst,
    dailySummary,
    sources,
    reads,
    readPagination,
    isLoading,
    hasError,
    toNextPage,
    toPrevPage,
  } = useDiary()

  return (
    <DiaryPage
      targetDate={todayJst}
      dailySummary={dailySummary}
      sources={sources}
      reads={reads}
      readPagination={readPagination}
      isLoading={isLoading}
      hasError={hasError}
      onNextPage={toNextPage}
      onPrevPage={toPrevPage}
    />
  )
}
