import { toJaDateString } from '@trend-diary/common/locale'
import { ChevronDown, Funnel } from 'lucide-react'
import { useState } from 'react'
import { twMerge } from 'tailwind-merge'
import { Button } from '@/client/components/shadcn/button'
import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/client/components/shadcn/pagination'
import {
  type Article,
  ArticleCard,
  DatePresetFilter,
  type DatePresetType,
  MediaFilter,
  type MediaType,
  ReadStatusFilter,
  type ReadStatusType,
} from '@/client/features/article'
import LoadingSpinner from '../../components/ui/feedback/loading-spinner'

const scrollToTop = () => {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const getPaginationClass = (isDisabled: boolean) => {
  const baseClass = 'border-solid border border-b-slate-400 cursor-pointer'
  return twMerge(baseClass, isDisabled ? 'opacity-50 cursor-not-allowed' : '')
}

interface FilterPanelProps {
  selectedMedia: MediaType
  selectedReadStatus: ReadStatusType
  selectedDatePreset: DatePresetType
  onApplyFilters: (filters: {
    media: MediaType
    readStatus: ReadStatusType
    datePreset: DatePresetType
  }) => void
  isLoggedIn: boolean
}

// draft state は適用済みフィルタが外部（URL 等）で変わったらリセットしたい。
// レンダー中 setState による同期ではなく、呼び出し側で適用済みフィルタを key にして
// 再マウントすることで draft を宣言的に初期化する（react ルール参照）。
function FilterPanel({
  selectedMedia,
  selectedReadStatus,
  selectedDatePreset,
  onApplyFilters,
  isLoggedIn,
}: FilterPanelProps) {
  const isMobile = useIsMobile()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [draftMedia, setDraftMedia] = useState<MediaType>(selectedMedia)
  const [draftReadStatus, setDraftReadStatus] = useState<ReadStatusType>(selectedReadStatus)
  const [draftDatePreset, setDraftDatePreset] = useState<DatePresetType>(selectedDatePreset)

  const appliedFilterCount =
    (selectedMedia ? 1 : 0) +
    (isLoggedIn && selectedReadStatus === 'unread' ? 1 : 0) +
    (selectedDatePreset !== 'today' ? 1 : 0)

  const handleToggleFilter = () => {
    if (!isFilterOpen) {
      setDraftMedia(selectedMedia)
      setDraftReadStatus(selectedReadStatus)
      setDraftDatePreset(selectedDatePreset)
    }
    setIsFilterOpen(!isFilterOpen)
  }

  const handleCancelFilter = () => {
    setDraftMedia(selectedMedia)
    setDraftReadStatus(selectedReadStatus)
    setDraftDatePreset(selectedDatePreset)
    setIsFilterOpen(false)
  }

  const handleClearFilter = () => {
    setDraftMedia(null)
    setDraftReadStatus('all')
    setDraftDatePreset('today')
    onApplyFilters({ media: null, readStatus: 'all', datePreset: 'today' })
    if (isMobile) {
      setIsFilterOpen(false)
    }
    scrollToTop()
  }

  const handleApplyFilter = () => {
    onApplyFilters({ media: draftMedia, readStatus: draftReadStatus, datePreset: draftDatePreset })
    if (isMobile) {
      setIsFilterOpen(false)
    }
    scrollToTop()
  }

  const handleDesktopMediaChange = (media: MediaType) => {
    setDraftMedia(media)
    onApplyFilters({ media, readStatus: draftReadStatus, datePreset: draftDatePreset })
    scrollToTop()
  }

  const handleDesktopReadStatusChange = (readStatus: ReadStatusType) => {
    setDraftReadStatus(readStatus)
    onApplyFilters({ media: draftMedia, readStatus, datePreset: draftDatePreset })
    scrollToTop()
  }

  const handleDesktopDatePresetChange = (datePreset: DatePresetType) => {
    setDraftDatePreset(datePreset)
    onApplyFilters({ media: draftMedia, readStatus: draftReadStatus, datePreset })
    scrollToTop()
  }

  if (isMobile) {
    return (
      <div className='mb-4 rounded-lg border border-gray-300 bg-white/50 p-4'>
        <button
          type='button'
          className='flex w-full items-center justify-between'
          onClick={handleToggleFilter}
          data-slot='mobile-filter-trigger'
        >
          <span className='inline-flex items-center gap-2'>
            <Funnel className='h-4 w-4 text-gray-600' />
            <span className='text-sm font-semibold text-gray-700'>絞り込み</span>
            {appliedFilterCount > 0 && (
              <span
                className='rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700'
                data-slot='mobile-filter-applied-count'
              >
                {appliedFilterCount}件適用中
              </span>
            )}
          </span>
          <ChevronDown
            className={twMerge(
              'h-4 w-4 text-gray-600 transition-transform',
              isFilterOpen ? 'rotate-180' : '',
            )}
          />
        </button>
        {isFilterOpen && (
          <div className='mt-4 space-y-4' data-slot='mobile-filter-panel'>
            <div className='flex w-full flex-col items-start gap-2'>
              <span className='text-sm font-medium text-gray-600'>媒体</span>
              <MediaFilter selectedMedia={draftMedia} onMediaChange={setDraftMedia} />
            </div>
            <div className='flex w-full flex-col items-start gap-2'>
              <span className='text-sm font-medium text-gray-600'>日付</span>
              <DatePresetFilter
                selectedDatePreset={draftDatePreset}
                onDatePresetChange={setDraftDatePreset}
              />
            </div>
            {isLoggedIn && (
              <div className='flex w-full flex-col items-start gap-2'>
                <span className='text-sm font-medium text-gray-600'>既読状態</span>
                <ReadStatusFilter
                  selectedReadStatus={draftReadStatus}
                  onReadStatusChange={setDraftReadStatus}
                />
              </div>
            )}
            <div className='flex items-center justify-end gap-2 pt-2'>
              <Button
                type='button'
                variant='ghost'
                onClick={handleCancelFilter}
                data-slot='mobile-filter-cancel'
              >
                キャンセル
              </Button>
              <Button
                type='button'
                variant='outline'
                onClick={handleClearFilter}
                data-slot='mobile-filter-clear'
              >
                クリア
              </Button>
              <Button type='button' onClick={handleApplyFilter} data-slot='mobile-filter-apply'>
                適用
              </Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className='mb-4 rounded-lg border border-gray-300 bg-white/50 p-4'>
      <h2 className='mb-3 inline-flex items-center gap-2 text-sm font-semibold text-gray-700'>
        <Funnel className='h-4 w-4 text-gray-600' />
        <span>絞り込み</span>
      </h2>
      <div className='space-y-3'>
        <div className='flex items-start gap-4'>
          <div className='flex flex-col gap-1'>
            <span className='text-xs font-medium text-gray-600'>媒体</span>
            <MediaFilter selectedMedia={draftMedia} onMediaChange={handleDesktopMediaChange} />
          </div>
          <div className='flex flex-col gap-1'>
            <span className='text-xs font-medium text-gray-600'>日付</span>
            <DatePresetFilter
              selectedDatePreset={draftDatePreset}
              onDatePresetChange={handleDesktopDatePresetChange}
            />
          </div>
          {isLoggedIn && (
            <div className='flex flex-col gap-1'>
              <span className='text-xs font-medium text-gray-600'>既読状態</span>
              <ReadStatusFilter
                selectedReadStatus={draftReadStatus}
                onReadStatusChange={handleDesktopReadStatusChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

interface Props {
  date: Date
  articles: Article[]
  openDrawer: (article: Article) => void
  isLoading: boolean
  page: number
  totalPages: number
  selectedMedia: MediaType
  selectedReadStatus: ReadStatusType
  selectedDatePreset: DatePresetType
  toNextPage: (currentPage: number) => void
  toPreviousPage: (currentPage: number) => void
  onApplyFilters: (filters: {
    media: MediaType
    readStatus: ReadStatusType
    datePreset: DatePresetType
  }) => void
  onToggleRead: (articleId: string, isRead: boolean) => void
  isLoggedIn: boolean
}

export default function TrendsPage({
  date,
  articles,
  openDrawer,
  isLoading,
  page,
  totalPages,
  selectedMedia,
  selectedReadStatus,
  selectedDatePreset,
  toNextPage,
  toPreviousPage,
  onApplyFilters,
  onToggleRead,
  isLoggedIn,
}: Props) {
  const isPrevDisabled = page <= 1
  const isNextDisabled = page >= totalPages

  const handleCardClick = (article: Article) => {
    openDrawer(article)
  }

  const handlePrevPageClick = () => {
    if (!isPrevDisabled) {
      toPreviousPage(page)
      scrollToTop()
    }
  }

  const handleNextPageClick = () => {
    if (!isNextDisabled) {
      toNextPage(page)
      scrollToTop()
    }
  }

  return (
    <div className='relative min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6'>
      <h1 className='pb-4 text-xl italic'>- {toJaDateString(date)} -</h1>
      <FilterPanel
        key={`${selectedMedia ?? ''}__${selectedReadStatus}__${selectedDatePreset}`}
        selectedMedia={selectedMedia}
        selectedReadStatus={selectedReadStatus}
        selectedDatePreset={selectedDatePreset}
        onApplyFilters={onApplyFilters}
        isLoggedIn={isLoggedIn}
      />
      {articles.length === 0 ? (
        <div className='text-gray-500'>記事がありません</div>
      ) : (
        <div data-slot='page-content'>
          <div className='flex flex-wrap gap-6'>
            {articles.map((article) => (
              <ArticleCard
                key={article.articleId}
                article={article}
                onCardClick={handleCardClick}
                onToggleRead={onToggleRead}
                isLoggedIn={isLoggedIn}
              />
            ))}
          </div>
          <Pagination className='mt-6'>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  aria-disabled={isPrevDisabled}
                  className={getPaginationClass(isPrevDisabled)}
                  onClick={handlePrevPageClick}
                />
              </PaginationItem>
              <PaginationItem>
                <span className='mx-4 text-sm'>
                  ページ {page} / {totalPages}
                </span>
              </PaginationItem>
              <PaginationItem>
                <PaginationNext
                  aria-disabled={isNextDisabled}
                  className={getPaginationClass(isNextDisabled)}
                  onClick={handleNextPageClick}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {isLoading && <LoadingSpinner />}
    </div>
  )
}
