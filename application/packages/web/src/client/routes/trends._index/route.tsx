import type { MetaFunction } from 'react-router'
import { useOutletContext } from 'react-router'
import {
  ArticleDrawer,
  useArticleDrawer,
  useArticles,
  useReadArticle,
} from '@/client/features/article'
import type { AppLayoutOutletContext } from '../app-layout'
import TrendsPage from './page'

export const meta: MetaFunction = () => [{ title: 'トレンド一覧 | TrendDiary' }]

export default function Trends() {
  const { isLoggedIn } = useOutletContext<AppLayoutOutletContext>()
  const {
    articles,
    reloadArticles,
    isLoading,
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

    // 1. APIコールで既読/未読を切り替え
    await (isRead ? markAsRead : markAsUnread)(articleId)

    // 2. 再fetchして状態を更新
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
