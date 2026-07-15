import type { MouseEvent } from 'react'
import { Button } from '@/client/components/shadcn/button'
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/client/components/shadcn/pagination'
import PageContainer from '@/client/components/ui/layout/page-container'
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
import { toJaDateString } from '@/common/locale/date'

// ローディング中に一覧領域を埋めるスケルトン枚数。1ページの件数に近い枚数で領域の急な伸縮を抑える
const SKELETON_KEYS = Array.from({ length: 8 }, (_, i) => `skeleton-${i}`)

// 無効時の淡色化・クリック抑止は buttonVariants の disabled: スタイルが担うため、ここでは枠線とカーソルのみ指定する
const PAGINATION_LINK_CLASS = 'border-solid border border-b-border cursor-pointer'

// 修飾キー・中クリック等（新規タブで開く等のブラウザ標準挙動）は href に任せ、通常クリックだけ SPA 遷移に差し替える
const isModifiedClick = (event: MouseEvent<HTMLAnchorElement>) =>
  event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey

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
  prevPageHref,
  nextPageHref,
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
    <PageContainer className='relative'>
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
        prevPageHref={prevPageHref}
        nextPageHref={nextPageHref}
        toNextPage={toNextPage}
        toPreviousPage={toPreviousPage}
      />
    </PageContainer>
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
  prevPageHref: string
  nextPageHref: string
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
  prevPageHref,
  nextPageHref,
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

  const handlePrevPageClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return
    event.preventDefault()
    toPreviousPage(page)
    scrollToTop()
  }

  const handleNextPageClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (isModifiedClick(event)) return
    event.preventDefault()
    toNextPage(page)
    scrollToTop()
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
              href={prevPageHref}
              disabled={isPrevDisabled}
              className={PAGINATION_LINK_CLASS}
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
              href={nextPageHref}
              disabled={isNextDisabled}
              className={PAGINATION_LINK_CLASS}
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
