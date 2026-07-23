import PageCard from '@/client/components/ui/layout/page-card'
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
    <PageCard title='未読消化'>
      <p className='mt-0.5 text-sm text-muted-foreground'>未読記事を1件ずつ確認できます。</p>
      <div className='mt-2'>
        <p className='mb-2 text-sm text-muted-foreground'>メディア</p>
        <MediaMultiFilter selectedMedia={selectedMedia} onMediaChange={onMediaChange} />
      </div>
      <p className='mt-1 text-sm text-muted-foreground'>残り {remainingCount} 件</p>

      <InboxContent
        isLoading={isLoading}
        hasError={hasError}
        article={article}
        isJustCompleted={isJustCompleted}
        onSkip={onSkip}
        onRead={onRead}
        onLater={onLater}
      />
    </PageCard>
  )
}

interface InboxContentProps extends InboxBodyProps {
  isLoading: boolean
  hasError: boolean
}

function InboxContent({
  isLoading,
  hasError,
  article,
  isJustCompleted,
  onSkip,
  onRead,
  onLater,
}: InboxContentProps) {
  if (isLoading) return <InboxBodySkeleton />
  // 取得エラー時は誤解を招く空表示を避けるため本文を出さない。エラーの案内と再試行はトーストに集約する
  if (hasError) return null

  return (
    <InboxBody
      article={article}
      isJustCompleted={isJustCompleted}
      onSkip={onSkip}
      onRead={onRead}
      onLater={onLater}
    />
  )
}
