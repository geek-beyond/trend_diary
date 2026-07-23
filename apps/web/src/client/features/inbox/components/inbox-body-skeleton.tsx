import { Skeleton } from '@/client/components/shadcn/skeleton'

export default function InboxBodySkeleton() {
  return (
    <div role='status' aria-label='読み込み中' className='mt-2'>
      {/* 視覚的なプレースホルダーは支援技術から隠す。InboxArticleCard と同じ高さ（タイトル 2lh / 著者 1lh / 本文 h-24 md:h-56）で組み、レイアウトシフトを避ける */}
      <div aria-hidden='true' className='flex flex-col rounded-xl border border-border bg-card p-5'>
        <div className='flex h-[2lh] flex-col gap-2'>
          <Skeleton className='h-5 w-3/4' />
          <Skeleton className='h-5 w-1/2' />
        </div>
        <div className='mt-2 flex h-[1lh] items-center'>
          <Skeleton className='h-4 w-40' />
        </div>
        <div className='mt-3 h-24 space-y-2 md:h-56'>
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-full' />
          <Skeleton className='h-4 w-5/6' />
        </div>
        <div className='mt-3 flex flex-wrap gap-2 md:mt-4'>
          <Skeleton className='h-9 w-20' />
          <Skeleton className='h-9 w-20' />
          <Skeleton className='h-9 w-20' />
        </div>
      </div>
    </div>
  )
}
