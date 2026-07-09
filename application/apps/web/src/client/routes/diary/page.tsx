import LoadingSpinner from '@/client/components/ui/feedback/loading-spinner'
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

interface Props {
  isLoggedIn: boolean
  isSessionLoading: boolean
  targetDate: string | null
  dateResolveError: boolean
  dailySummary: Summary
  sources: Source[]
  reads: ReadItem[]
  readPagination: ReadPagination
  isLoading: boolean
  onNextPage: () => void
  onPrevPage: () => void
}

export default function DiaryPage({
  isLoggedIn,
  isSessionLoading,
  targetDate,
  dateResolveError,
  dailySummary,
  sources,
  reads,
  readPagination,
  isLoading,
  onNextPage,
  onPrevPage,
}: Props) {
  const pageTitle = 'ダイアリー'

  // セッション確定までは未ログイン画面のちらつきを避けるためローディングを表示する
  if (isSessionLoading) {
    return <LoadingSpinner />
  }

  if (!isLoggedIn) {
    return <LoginRequired pageTitle={pageTitle} />
  }

  return (
    <DiaryPageLayout pageTitle={pageTitle} dateResolveError={dateResolveError}>
      <DiarySummarySection
        sources={sources}
        displaySummary={dailySummary}
        targetDate={targetDate ?? undefined}
      />
      <DiaryReadListSection
        isLoading={isLoading}
        shouldShowDailyDetails={true}
        reads={reads}
        emptyState={<p className='mt-2 text-sm text-gray-500'>読了した記事はまだありません。</p>}
      />
      <DiaryReadPagination
        onNextPage={onNextPage}
        onPrevPage={onPrevPage}
        readPagination={readPagination}
        shouldShowDailyDetails={true}
      />
    </DiaryPageLayout>
  )
}
