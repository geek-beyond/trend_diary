import { toJaDateString } from '@trend-diary/common/locale'
import { twMerge } from 'tailwind-merge'
import { Button } from '@/client/components/shadcn/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/client/components/shadcn/pagination'
import FetchErrorAlert from '@/client/components/ui/feedback/fetch-error-alert'
import {
  type Article,
  ArticleCard,
  ArticleCardSkeleton,
  type DatePresetType,
  type FilterParams,
  FilterPanel,
  type MediaType,
  type ReadStatusType,
} from '@/client/features/article'
import { scrollToTop } from '@/client/lib/scroll'

// ローディング中に一覧領域を埋めるスケルトン枚数。1ページの件数に近い枚数で領域の急な伸縮を抑える
const SKELETON_KEYS = Array.from({ length: 8 }, (_, i) => `skeleton-${i}`)

const getPaginationClass = (isDisabled: boolean) =>
  twMerge(
    'border-solid border border-b-border cursor-pointer',
    isDisabled ? 'opacity-50 cursor-not-allowed' : '',
  )

const DEFAULT_FILTERS: FilterParams = {
  media: undefined,
  readStatus: 'all',
  datePreset: 'today',
}

interface Props {
  date: Date
  articles: Article[]
  openDrawer: (article: Article) => void
  isLoading: boolean
  hasError: boolean
  onRetry: () => void
  page: number
  totalPages: number
  selectedMedia: MediaType
  selectedReadStatus: ReadStatusType
  selectedDatePreset: DatePresetType
  toNextPage: (currentPage: number) => void
  toPreviousPage: (currentPage: number) => void
  onApplyFilters: (filters: FilterParams) => void
  onToggleRead: (articleId: string, isRead: boolean) => void
  isLoggedIn: boolean
}

export default function TrendsPage({
  date,
  articles,
  openDrawer,
  isLoading,
  hasError,
  onRetry,
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

  const appliedFilters: FilterParams = {
    media: selectedMedia,
    readStatus: selectedReadStatus,
    datePreset: selectedDatePreset,
  }

  const hasActiveFilters =
    selectedMedia !== undefined || selectedReadStatus !== 'all' || selectedDatePreset !== 'today'

  const handleCardClick = (article: Article) => {
    openDrawer(article)
  }

  const handleResetFilters = () => {
    onApplyFilters(DEFAULT_FILTERS)
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
    <div className='relative min-h-screen bg-gradient-to-br from-muted to-background p-6'>
      <h1 className='pb-4 text-xl italic'>- {toJaDateString(date)} -</h1>
      {/* 適用済みフィルタが外部（URL 等）で変わったら draft を初期化したいので key で再マウントする。
          key はフィールド追加時の付け忘れを防ぐため applied の値から導出する */}
      <FilterPanel
        key={Object.values(appliedFilters).join('__')}
        applied={appliedFilters}
        onApplyFilters={onApplyFilters}
        isLoggedIn={isLoggedIn}
      />
      {isLoading ? (
        <div
          role='status'
          aria-label='記事を読み込み中'
          className='flex flex-wrap gap-6'
          data-slot='page-skeleton'
        >
          {SKELETON_KEYS.map((key) => (
            <ArticleCardSkeleton key={key} />
          ))}
        </div>
      ) : hasError ? (
        <FetchErrorAlert onRetry={onRetry} />
      ) : articles.length === 0 ? (
        <div className='text-muted-foreground'>
          <p>記事がありません</p>
          {hasActiveFilters && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='mt-2'
              onClick={handleResetFilters}
            >
              フィルタを解除する
            </Button>
          )}
        </div>
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
    </div>
  )
}
