import type { ReadPagination } from '@/client/features/diary/model/types'

interface Props {
  onNextPage: () => void
  onPrevPage: () => void
  readPagination: ReadPagination
  shouldShowDailyDetails: boolean
}

export default function DiaryReadPagination({
  onNextPage,
  onPrevPage,
  readPagination,
  shouldShowDailyDetails,
}: Props) {
  const paginationLabel =
    shouldShowDailyDetails && readPagination.totalPages > 0
      ? `${readPagination.page} / ${readPagination.totalPages}`
      : '- / -'

  return (
    <div className='mt-4 flex items-center justify-start gap-3'>
      <button
        type='button'
        className='rounded border border-border px-3 py-1 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50'
        onClick={onPrevPage}
        disabled={!shouldShowDailyDetails || !readPagination.hasPrev}
        data-slot='diary-read-prev'
      >
        前へ
      </button>
      <span className='text-sm text-muted-foreground'>{paginationLabel}</span>
      <button
        type='button'
        className='rounded border border-border px-3 py-1 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-50'
        onClick={onNextPage}
        disabled={!shouldShowDailyDetails || !readPagination.hasNext}
        data-slot='diary-read-next'
      >
        次へ
      </button>
    </div>
  )
}
