import { Card, CardContent } from '@/client/components/shadcn/card'
import { Skeleton } from '@/client/components/shadcn/skeleton'
import { ARTICLE_CARD_FRAME_CLASS, ARTICLE_THUMBNAIL_FRAME_CLASS } from './article-card-frame'

export default function ArticleCardSkeleton() {
  return (
    <Card
      // 純粋な視覚的プレースホルダーのため支援技術からは隠し、読み込み状態の通知は呼び出し側の role=status に委ねる
      aria-hidden='true'
      data-slot='card'
      data-testid='article-card-skeleton'
      className={ARTICLE_CARD_FRAME_CLASS}
    >
      <div className={ARTICLE_THUMBNAIL_FRAME_CLASS}>
        <Skeleton className='h-full w-full rounded-none' />
      </div>
      <CardContent className='flex min-h-0 flex-1 flex-col p-4'>
        <div className='flex-1 space-y-2'>
          <Skeleton className='h-4 w-3/4' />
          <Skeleton className='h-4 w-1/2' />
        </div>
        <div className='mt-3 flex items-end'>
          <Skeleton className='h-4 w-20' />
        </div>
      </CardContent>
    </Card>
  )
}
