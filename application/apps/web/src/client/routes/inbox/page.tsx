import LoadingSpinner from '@/client/components/ui/feedback/loading-spinner'
import LoginRequired from '@/client/components/ui/feedback/login-required'
import { MediaFilter, type MediaType as FilterMediaType } from '@/client/features/article'
import { InboxBody, type InboxBodyProps } from '@/client/features/inbox'

interface Props extends InboxBodyProps {
  isLoading: boolean
  isLoggedIn: boolean
  isSessionLoading: boolean
  remainingCount: number
  selectedMedia: FilterMediaType
  onMediaChange: (media: FilterMediaType) => void
}

export default function InboxPage({
  article,
  isLoading,
  isJustCompleted,
  isLoggedIn,
  isSessionLoading,
  onSkip,
  onRead,
  onLater,
  remainingCount,
  selectedMedia,
  onMediaChange,
}: Props) {
  // セッション確定までは未ログイン画面のちらつきを避けるためローディングを表示する
  if (isSessionLoading) {
    return <LoadingSpinner />
  }

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

        {isLoading ? (
          <p className='mt-4 text-sm text-gray-600'>読み込み中...</p>
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
