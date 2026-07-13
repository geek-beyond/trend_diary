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

  // 取得エラー時は誤解を招く空表示を避けるため本文を出さない。エラーの案内と再試行はトーストに集約する
  return (
    <PageCard title={pageTitle}>
      {hasError && !isLoading ? null : (
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
