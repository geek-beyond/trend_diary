import { AnchorLink } from '@/client/components/ui/navigation/link'
import type { Article } from '../hooks/use-unread-digestion'
import InboxArticleCard from './inbox-article-card'
import InboxCompletionCard from './inbox-completion-card'

export interface InboxBodyProps {
  article: Article | null
  isJustCompleted: boolean
  onSkip: () => Promise<void>
  onRead: () => Promise<void>
  onLater: () => void
}

export default function InboxBody({
  article,
  isJustCompleted,
  onSkip,
  onRead,
  onLater,
}: InboxBodyProps) {
  if (article) {
    return <InboxArticleCard article={article} onSkip={onSkip} onRead={onRead} onLater={onLater} />
  }
  if (isJustCompleted) {
    return <InboxCompletionCard />
  }
  return (
    <p className='mt-4 text-sm text-muted-foreground'>
      <span>未読記事はありません</span>
      <AnchorLink to='/trends' className='ml-1 text-blue-700 underline hover:text-blue-800'>
        トレンド一覧へ
      </AnchorLink>
    </p>
  )
}
