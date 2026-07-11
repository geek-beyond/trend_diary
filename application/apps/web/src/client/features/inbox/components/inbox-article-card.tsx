import { Button } from '@/client/components/shadcn/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/client/components/shadcn/tooltip'
// barrel 経由だと article のデータ取得フック群まで読み込まれるため、表示専用の MediaIcon は実体を直接参照する
import MediaIcon, { toMediaType } from '@/client/features/article/components/media-icon'
import type { Article } from '../hooks/use-unread-digestion'

interface Props {
  article: Article
  onSkip: () => Promise<void>
  onRead: () => Promise<void>
  onLater: () => void
}

export default function InboxArticleCard({ article, onSkip, onRead, onLater }: Props) {
  return (
    <div className='mt-2 flex flex-col rounded-xl border border-border bg-card p-5'>
      <h2 className='flex h-[2lh] items-start gap-2 text-lg font-semibold text-foreground leading-relaxed'>
        <span className='mt-0.5 shrink-0'>
          <MediaIcon media={toMediaType(article.media)} size='md' />
        </span>
        <span className='line-clamp-2'>{article.title}</span>
      </h2>
      <div className='mt-2 flex h-[1lh] items-center gap-3 overflow-hidden text-sm text-muted-foreground'>
        <span className='min-w-0 truncate'>著者: {article.author}</span>
      </div>
      <p className='mt-3 h-24 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words pr-1 text-sm leading-relaxed text-foreground md:h-56'>
        {article.description}
      </p>
      <div className='sticky bottom-0 -mx-5 mt-3 flex flex-wrap gap-2 border-t border-border bg-card/95 px-5 pt-3 pb-1 md:static md:mx-0 md:mt-4 md:border-0 md:bg-transparent md:p-0'>
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
  )
}
