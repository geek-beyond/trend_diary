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
  onNextPage,
  onPrevPage,
}: Props) {
  const pageTitle = 'ダイアリー'

  return (
    <DiaryPageLayout pageTitle={pageTitle} dateResolveError={dateResolveError}>
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
    </DiaryPageLayout>
  )
}
