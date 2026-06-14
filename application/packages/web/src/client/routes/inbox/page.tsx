import LoginRequired from '@/client/components/ui/feedback/login-required'
import { MediaFilter, type MediaType as FilterMediaType } from '@/client/features/article'
import { type Article, InboxArticleCard, InboxCompletionCard } from '@/client/features/inbox'

interface Props {
  article: Article | null
  isLoading: boolean
  isJustCompleted: boolean
  isLoggedIn: boolean
  onSkip: () => Promise<void>
  onRead: () => Promise<void>
  onLater: () => void
  remainingCount: number
  selectedMedia: FilterMediaType
  onMediaChange: (media: FilterMediaType) => void
}

interface BodyProps {
  article: Article | null
  isLoading: boolean
  isJustCompleted: boolean
  onSkip: () => Promise<void>
  onRead: () => Promise<void>
  onLater: () => void
}

function InboxBody({ article, isLoading, isJustCompleted, onSkip, onRead, onLater }: BodyProps) {
  if (isLoading) {
    return <p className='mt-4 text-sm text-gray-600'>読み込み中...</p>
  }
  if (article) {
    return <InboxArticleCard article={article} onSkip={onSkip} onRead={onRead} onLater={onLater} />
  }
  if (isJustCompleted) {
    return <InboxCompletionCard />
  }
  return <p className='mt-4 text-sm text-gray-600'>未読記事はありません</p>
}

export default function InboxPage({
  article,
  isLoading,
  isJustCompleted,
  isLoggedIn,
  onSkip,
  onRead,
  onLater,
  remainingCount,
  selectedMedia,
  onMediaChange,
}: Props) {
  if (!isLoggedIn) {
    return <LoginRequired pageTitle='未読消化' />
  }

  return (
    <div className='min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6'>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-white/40 bg-white/50 p-6 shadow-xl backdrop-blur-sm'>
        <h1 className='text-xl font-semibold text-gray-900'>未読消化</h1>
        <p className='mt-0.5 text-sm text-gray-600'>未読記事を1件ずつ確認できます。</p>
        <div className='mt-2'>
          <p className='mb-2 text-sm text-gray-600'>メディア</p>
          <MediaFilter selectedMedia={selectedMedia} onMediaChange={onMediaChange} />
        </div>
        <p className='mt-1 text-sm text-gray-600'>残り {remainingCount} 件</p>

        <InboxBody
          article={article}
          isLoading={isLoading}
          isJustCompleted={isJustCompleted}
          onSkip={onSkip}
          onRead={onRead}
          onLater={onLater}
        />
      </div>
    </div>
  )
}
