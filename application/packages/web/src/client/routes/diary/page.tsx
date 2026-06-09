import DiaryLoginRequired from '@/client/features/diary/components/login-required'
import DiaryPageLayout from '@/client/features/diary/components/page-layout'
import DiaryReadListSection from '@/client/features/diary/components/read-list-section'
import DiaryReadPagination from '@/client/features/diary/components/read-pagination'
import DiarySummarySection from '@/client/features/diary/components/summary-section'
import {
  type ReadItem,
  type ReadPagination,
  type Source,
  type Summary,
} from '@/client/features/diary/types'

interface Props {
  isLoggedIn: boolean
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

  if (!isLoggedIn) {
    return <DiaryLoginRequired pageTitle={pageTitle} />
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
