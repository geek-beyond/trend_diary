import { toJaDateString } from '@trend-diary/common/locale'
import { twMerge } from 'tailwind-merge'
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
  type DatePresetType,
  type FilterParams,
  FilterPanel,
  type MediaType,
  type ReadStatusType,
} from '@/client/features/article'
import { scrollToTop } from '@/client/lib/scroll'
import LoadingSpinner from '../../components/ui/feedback/loading-spinner'

const getPaginationClass = (isDisabled: boolean) =>
  twMerge(
    'border-solid border border-b-slate-400 cursor-pointer',
    isDisabled ? 'opacity-50 cursor-not-allowed' : '',
  )

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
  onApplyFilters: (filters: FilterParams) => void
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
      {/* 適用済みフィルタが外部（URL 等）で変わったら draft を初期化したいので key で再マウントする */}
      <FilterPanel
        key={`${selectedMedia ?? ''}__${selectedReadStatus}__${selectedDatePreset}`}
        applied={{
          media: selectedMedia,
          readStatus: selectedReadStatus,
          datePreset: selectedDatePreset,
        }}
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
