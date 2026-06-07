import { useState } from 'react'
import type { MetaFunction } from 'react-router'
import { useOutletContext } from 'react-router'
import type { AppLayoutOutletContext } from '../app-layout'
import type { MediaType } from '../trends._index/components/media-filter'
import useUnreadDigestion from './hooks/use-unread-digestion'
import InboxPage from './page'

export const meta: MetaFunction = () => [{ title: '未読消化 | TrendDiary' }]

export default function InboxRoute() {
  const { isLoggedIn } = useOutletContext<AppLayoutOutletContext>()
  const [selectedMedia, setSelectedMedia] = useState<MediaType>(null)
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
      remainingCount={remainingCount}
      onSkip={handleSkip}
      onRead={handleRead}
      onLater={handleLater}
      selectedMedia={selectedMedia}
      onMediaChange={setSelectedMedia}
    />
  )
}
