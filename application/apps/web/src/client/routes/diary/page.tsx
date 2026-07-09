import FetchErrorState from '@/client/components/ui/feedback/fetch-error-state'
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
  targetDate: string | null
  dateResolveError: boolean
  dailySummary: Summary
  sources: Source[]
  reads: ReadItem[]
  readPagination: ReadPagination
  isLoading: boolean
  hasError: boolean
  onRetry: () => void
  onNextPage: () => void
  onPrevPage: () => void
}

export default function DiaryPage({
  targetDate,
  dateResolveError,
  dailySummary,
  sources,
  reads,
  readPagination,
  isLoading,
  hasError,
  onRetry,
  onNextPage,
  onPrevPage,
}: Props) {
  const pageTitle = 'ダイアリー'

  return (
    <DiaryPageLayout pageTitle={pageTitle} dateResolveError={dateResolveError}>
      {hasError && !isLoading ? (
        <FetchErrorState onRetry={onRetry} />
      ) : (
        <>
          <DiarySummarySection
            sources={sources}
            displaySummary={dailySummary}
            targetDate={targetDate ?? undefined}
          />
          <DiaryReadListSection isLoading={isLoading} shouldShowDailyDetails={true} reads={reads} />
          <DiaryReadPagination
            onNextPage={onNextPage}
            onPrevPage={onPrevPage}
            readPagination={readPagination}
            shouldShowDailyDetails={true}
          />
        </>
      )}
    </DiaryPageLayout>
  )
}
