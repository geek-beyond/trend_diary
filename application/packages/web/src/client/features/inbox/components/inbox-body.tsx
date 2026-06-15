import type { Article } from '../hooks/use-unread-digestion'
import InboxArticleCard from './inbox-article-card'
import InboxCompletionCard from './inbox-completion-card'

interface Props {
  article: Article | null
  isJustCompleted: boolean
  onSkip: () => Promise<void>
  onRead: () => Promise<void>
  onLater: () => void
}

export default function InboxBody({ article, isJustCompleted, onSkip, onRead, onLater }: Props) {
  if (article) {
    return <InboxArticleCard article={article} onSkip={onSkip} onRead={onRead} onLater={onLater} />
  }
  if (isJustCompleted) {
    return <InboxCompletionCard />
  }
  return <p className='mt-4 text-sm text-gray-600'>未読記事はありません</p>
}
