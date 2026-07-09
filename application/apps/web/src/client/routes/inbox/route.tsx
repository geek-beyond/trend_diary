import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { useOutletContext } from 'react-router'
import { type MediaType } from '@/client/features/article'
import { useUnreadDigestion } from '@/client/features/inbox'
import type { AppLayoutOutletContext } from '../app-layout'
import InboxPage from './page'

export const meta: MetaFunction = () => [{ title: '未読消化 | TrendDiary' }]

export default function InboxRoute() {
  const { isLoggedIn, isSessionLoading } = useOutletContext<AppLayoutOutletContext>()
  const [selectedMedia, setSelectedMedia] = useState<MediaType>(undefined)
  const {
    isLoading,
    isJustCompleted,
    currentArticle,
    remainingCount,
    handleSkip,
    handleRead,
    handleLater,
  } = useUnreadDigestion(isLoggedIn, selectedMedia)

  return (
    <InboxPage
      article={currentArticle}
      isLoading={isLoading}
      isJustCompleted={isJustCompleted}
      isLoggedIn={isLoggedIn}
      isSessionLoading={isSessionLoading}
      remainingCount={remainingCount}
      onSkip={handleSkip}
      onRead={handleRead}
      onLater={handleLater}
      selectedMedia={selectedMedia}
      onMediaChange={setSelectedMedia}
    />
  )
}
