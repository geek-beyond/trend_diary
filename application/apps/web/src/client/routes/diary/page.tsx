import PageCard from '@/client/components/ui/layout/page-card'
import {
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
  onNextPage,
  onPrevPage,
}: Props) {
  const pageTitle = 'ダイアリー'

  // 取得エラー・日付解決エラー時は誤解を招く空表示を避けるため本文を出さない。案内はトーストに集約する
  return (
    <PageCard title={pageTitle}>
      {(hasError || dateResolveError) && !isLoading ? null : (
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
    </PageCard>
  )
}
