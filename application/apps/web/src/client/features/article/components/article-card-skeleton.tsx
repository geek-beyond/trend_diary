import { Card, CardContent } from '@/client/components/shadcn/card'
import { Skeleton } from '@/client/components/shadcn/skeleton'

// ArticleCard と同じ寸法（h-56 / sm:w-64、サムネイル h-28）で組み、ローディング前後のレイアウトシフトを避ける
export default function ArticleCardSkeleton() {
  return (
    <Card
      // 純粋な視覚的プレースホルダーのため支援技術からは隠し、読み込み状態の通知は呼び出し側の role=status に委ねる
      aria-hidden='true'
      data-slot='card'
      data-testid='article-card-skeleton'
      className='h-56 w-full gap-0 sm:w-64 rounded-3xl border border-border bg-card/30 py-0 shadow-2xl backdrop-blur-xl'
    >
      <div className='h-28 w-full shrink-0 overflow-hidden rounded-t-3xl'>
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
