import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { type MediaType } from '@/client/features/article'
import { useUnreadDigestion } from '@/client/features/inbox'
import InboxPage from './page'

export const meta: MetaFunction = () => [{ title: '未読消化 | TrendDiary' }]

export default function InboxRoute() {
  const [selectedMedia, setSelectedMedia] = useState<MediaType>(undefined)
  const {
    isLoading,
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
