import { MediaMultiFilter, type SelectedMedia } from '@/client/features/article'
import { InboxBody, InboxBodySkeleton, type InboxBodyProps } from '@/client/features/inbox'

interface Props extends InboxBodyProps {
  isLoading: boolean
  hasError: boolean
  remainingCount: number
  selectedMedia: SelectedMedia
  onMediaChange: (media: SelectedMedia) => void
}

export default function InboxPage({
  article,
  isLoading,
  hasError,
  isJustCompleted,
  onSkip,
  onRead,
  onLater,
  remainingCount,
  selectedMedia,
  onMediaChange,
}: Props) {
  return (
    <div className='flex-1 bg-gradient-to-br from-muted to-background p-6'>
      <div className='mx-auto w-full max-w-3xl rounded-2xl border border-border bg-card/50 p-6 shadow-xl backdrop-blur-sm'>
        <h1 className='text-xl font-semibold text-foreground'>未読消化</h1>
        <p className='mt-0.5 text-sm text-muted-foreground'>未読記事を1件ずつ確認できます。</p>
        <div className='mt-2'>
          <p className='mb-2 text-sm text-muted-foreground'>メディア</p>
          <MediaMultiFilter selectedMedia={selectedMedia} onMediaChange={onMediaChange} />
        </div>
        <p className='mt-1 text-sm text-muted-foreground'>残り {remainingCount} 件</p>

        {/* 取得エラー時は誤解を招く空表示を避けるため本文を出さない。エラーの案内と再試行はトーストに集約する */}
        {isLoading ? (
          <InboxBodySkeleton />
        ) : hasError ? null : (
          <InboxBody
            article={article}
            isJustCompleted={isJustCompleted}
            onSkip={onSkip}
            onRead={onRead}
            onLater={onLater}
          />
        )}
      </div>
    </div>
  )
}
