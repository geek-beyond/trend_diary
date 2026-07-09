import FetchErrorAlert from '@/client/components/ui/feedback/fetch-error-alert'
import { MediaFilter, type MediaType as FilterMediaType } from '@/client/features/article'
import { InboxBody, InboxBodySkeleton, type InboxBodyProps } from '@/client/features/inbox'

interface Props extends InboxBodyProps {
  isLoading: boolean
  hasError: boolean
  onRetry: () => void
  remainingCount: number
  selectedMedia: FilterMediaType
  onMediaChange: (media: FilterMediaType) => void
}

export default function InboxPage({
  article,
  isLoading,
  hasError,
  onRetry,
  isJustCompleted,
  onSkip,
  onRead,
  onLater,
  remainingCount,
  selectedMedia,
  onMediaChange,
}: Props) {
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

        {isLoading ? (
          <InboxBodySkeleton />
        ) : hasError ? (
          <div className='mt-4'>
            <FetchErrorAlert onRetry={onRetry} />
          </div>
        ) : (
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
