import type { MetaFunction } from 'react-router'
import { useOutletContext } from 'react-router'
import {
  ArticleDrawer,
  useArticleDrawer,
  useArticles,
  useReadArticle,
} from '@/client/features/article'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import type { AppLayoutOutletContext } from '../app-layout'
import TrendsPage from './page'

export const meta: MetaFunction = ({ matches, location }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: 'トレンド一覧 | TrendDiary',
      description: 'QiitaやZennの最新記事を一覧で確認し、読んだかどうかを記録できます。',
      path: location.pathname,
    }),
  )

export default function Trends() {
  const { isLoggedIn } = useOutletContext<AppLayoutOutletContext>()
  const {
    articles,
    reloadArticles,
    isLoading,
    hasError,
    page,
    totalPages,
    date,
    handleFiltersApply,
    toPreviousPage,
    toNextPage,
    selectedMedia,
    selectedReadStatus,
    selectedDatePreset,
  } = useArticles(isLoggedIn)
  const {
    isOpen: isDrawerOpen,
    selectedArticle,
    open: openDrawer,
    close: closeDrawer,
  } = useArticleDrawer()
  const { markAsRead, markAsUnread } = useReadArticle()

  const handleToggleRead = async (articleId: string, isRead: boolean) => {
    const originalArticle = articles.find((a) => a.articleId === articleId)
    if (!originalArticle) return

    await (isRead ? markAsRead : markAsUnread)(articleId)
    reloadArticles()
  }

  const handleMarkAsRead = async (articleId: string) => {
    await handleToggleRead(articleId, true)
  }

  return (
    <>
      <TrendsPage
        date={date}
        articles={articles}
        openDrawer={openDrawer}
        isLoading={isLoading}
        hasError={hasError}
        onRetry={reloadArticles}
        page={page}
        totalPages={totalPages}
        selectedMedia={selectedMedia}
        toPreviousPage={toPreviousPage}
        toNextPage={toNextPage}
        selectedReadStatus={selectedReadStatus}
        selectedDatePreset={selectedDatePreset}
        onApplyFilters={handleFiltersApply}
        onToggleRead={handleToggleRead}
        isLoggedIn={isLoggedIn}
      />
      {selectedArticle && (
        <ArticleDrawer
          key={selectedArticle.articleId}
          article={selectedArticle}
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
          onMarkAsRead={handleMarkAsRead}
          isLoggedIn={isLoggedIn}
        />
      )}
    </>
  )
}
