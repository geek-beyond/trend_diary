import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { ALL_MEDIA, type SelectedMedia } from '@/client/features/article'
import { useUnreadDigestion } from '@/client/features/inbox'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import InboxPage from './page'

export const meta: MetaFunction = ({ matches, location }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: '未読消化 | TrendDiary',
      description: '未読の記事を1件ずつ確認しながら、読んだかどうかを効率的に管理できます。',
      path: location.pathname,
    }),
  )

export default function InboxRoute() {
  const [selectedMedia, setSelectedMedia] = useState<SelectedMedia>(ALL_MEDIA)
  const {
    isLoading,
    hasError,
    isJustCompleted,
    currentArticle,
    remainingCount,
    handleSkip,
    handleRead,
    handleLater,
  } = useUnreadDigestion(selectedMedia)

  return (
    <InboxPage
      article={currentArticle}
      isLoading={isLoading}
      hasError={hasError}
      isJustCompleted={isJustCompleted}
      remainingCount={remainingCount}
      onSkip={handleSkip}
      onRead={handleRead}
      onLater={handleLater}
      selectedMedia={selectedMedia}
      onMediaChange={setSelectedMedia}
    />
  )
}
