import { isArticleMedia } from '@trend-diary/domain/article/media'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/client/components/shadcn/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/client/components/shadcn/tooltip'
import LoginRequired from '@/client/components/ui/feedback/login-required'
import {
  MediaFilter,
  MediaIcon,
  type MediaIconType as IconMediaType,
  type MediaType as FilterMediaType,
} from '@/client/features/article'
import type { Article } from '@/client/features/inbox'

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

const toMediaType = (media: string): IconMediaType => {
  if (isArticleMedia(media)) return media
  return 'zenn'
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

        {isLoading && <p className='mt-4 text-sm text-gray-600'>読み込み中...</p>}

        {!isLoading && !article && !isJustCompleted && (
          <p className='mt-4 text-sm text-gray-600'>未読記事はありません</p>
        )}

        {!isLoading && !article && isJustCompleted && (
          <section
            data-slot='inbox-completion-card'
            className='animate-in fade-in zoom-in-95 mt-4 rounded-xl border border-emerald-200 bg-emerald-50/80 p-5 text-emerald-900 duration-700'
          >
            <span className='inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold'>
              消化完了
            </span>
            <div className='mt-3 flex items-center gap-2'>
              <CheckCircle2 className='h-5 w-5 shrink-0' />
              <p className='text-sm leading-relaxed text-emerald-800'>
                いいペース。次の更新までこのペースをキープしよう。
              </p>
            </div>
          </section>
        )}

        {!isLoading && article && (
          <div className='mt-2 flex flex-col rounded-xl border border-gray-200 bg-white p-5'>
            <h2 className='flex h-[2lh] items-start gap-2 text-lg font-semibold text-gray-900 leading-relaxed'>
              <span className='mt-0.5 shrink-0'>
                <MediaIcon media={toMediaType(article.media)} size='md' />
              </span>
              <span className='line-clamp-2'>{article.title}</span>
            </h2>
            <div className='mt-2 flex h-[1lh] items-center gap-3 overflow-hidden text-sm text-gray-600'>
              <span className='min-w-0 truncate'>著者: {article.author}</span>
            </div>
            <p className='mt-3 h-24 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words pr-1 text-sm leading-relaxed text-gray-700 md:h-56'>
              {article.description}
            </p>
            <div className='sticky bottom-0 -mx-5 mt-3 flex flex-wrap gap-2 border-t border-gray-200 bg-white/95 px-5 pt-3 pb-1 md:static md:mx-0 md:mt-4 md:border-0 md:bg-transparent md:p-0'>
              <Tooltip>
                <TooltipTrigger asChild={true}>
                  <Button type='button' variant='outline' onClick={onSkip}>
                    スキップ
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='top' align='start' className='bg-primary/85'>
                  対象外にする
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild={true}>
                  <Button type='button' onClick={onRead}>
                    読む
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='top' align='start' className='bg-primary/85'>
                  読んで消化する
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild={true}>
                  <Button type='button' variant='secondary' onClick={onLater}>
                    後で
                  </Button>
                </TooltipTrigger>
                <TooltipContent side='top' align='start' className='bg-primary/85'>
                  このセッション内であとで見る
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
