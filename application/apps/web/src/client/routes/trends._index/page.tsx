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
import {
  type Article,
  ArticleCard,
  ArticleCardSkeleton,
  ALL_MEDIA,
  type DatePresetType,
  type FilterParams,
  FilterPanel,
  isAllMediaSelected,
  type ReadStatusType,
  type SelectedMedia,
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
  media: ALL_MEDIA,
  readStatus: 'all',
  datePreset: 'today',
}

// hasActiveFilters / onResetFilters は 0 件表示用にこのページで算出して渡すため取り込まない
interface Props extends Omit<
  ArticleListProps,
  'onCardClick' | 'hasActiveFilters' | 'onResetFilters'
> {
  date: Date
  openDrawer: ArticleListProps['onCardClick']
  selectedMedia: SelectedMedia
  selectedReadStatus: ReadStatusType
  selectedDatePreset: DatePresetType
  onApplyFilters: (filters: FilterParams) => void
}

export default function TrendsPage({
  date,
  articles,
  openDrawer,
  isLoading,
  hasError,
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
  const appliedFilters: FilterParams = {
    media: selectedMedia,
    readStatus: selectedReadStatus,
    datePreset: selectedDatePreset,
  }

  const hasActiveFilters =
    !isAllMediaSelected(selectedMedia) ||
    selectedReadStatus !== 'all' ||
    selectedDatePreset !== 'today'

  const handleResetFilters = () => {
    onApplyFilters(DEFAULT_FILTERS)
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
      <ArticleList
        isLoading={isLoading}
        hasError={hasError}
        articles={articles}
        hasActiveFilters={hasActiveFilters}
        onResetFilters={handleResetFilters}
        onCardClick={openDrawer}
        onToggleRead={onToggleRead}
        isLoggedIn={isLoggedIn}
        page={page}
        totalPages={totalPages}
        toNextPage={toNextPage}
        toPreviousPage={toPreviousPage}
      />
    </div>
  )
}

interface ArticleListProps {
  isLoading: boolean
  hasError: boolean
  articles: Article[]
  hasActiveFilters: boolean
  onResetFilters: () => void
  onCardClick: (article: Article) => void
  onToggleRead: (articleId: string, isRead: boolean) => void
  isLoggedIn: boolean
  page: number
  totalPages: number
  toNextPage: (currentPage: number) => void
  toPreviousPage: (currentPage: number) => void
}

function ArticleList({
  isLoading,
  hasError,
  articles,
  hasActiveFilters,
  onResetFilters,
  onCardClick,
  onToggleRead,
  isLoggedIn,
  page,
  totalPages,
  toNextPage,
  toPreviousPage,
}: ArticleListProps) {
  if (isLoading) return <ArticleListSkeleton />
  // 取得エラー時は誤解を招く空表示（0件表示）を避けるため一覧を出さない。案内と再試行はトーストに集約する
  if (hasError) return null
  if (articles.length === 0) {
    return <EmptyArticleList hasActiveFilters={hasActiveFilters} onResetFilters={onResetFilters} />
  }

  const isPrevDisabled = page <= 1
  const isNextDisabled = page >= totalPages

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
    <div>
      <div className='flex flex-wrap gap-6'>
        {articles.map((article) => (
          <ArticleCard
            key={article.articleId}
            article={article}
            onCardClick={onCardClick}
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
  )
}

interface EmptyArticleListProps {
  hasActiveFilters: boolean
  onResetFilters: () => void
}

function EmptyArticleList({ hasActiveFilters, onResetFilters }: EmptyArticleListProps) {
  return (
    <div className='text-muted-foreground'>
      <p>記事がありません</p>
      {hasActiveFilters && (
        <Button type='button' variant='outline' size='sm' className='mt-2' onClick={onResetFilters}>
          フィルタを解除する
        </Button>
      )}
    </div>
  )
}

function ArticleListSkeleton() {
  return (
    <div role='status' aria-label='記事を読み込み中' className='flex flex-wrap gap-6'>
      {SKELETON_KEYS.map((key) => (
        <ArticleCardSkeleton key={key} />
      ))}
    </div>
  )
}
