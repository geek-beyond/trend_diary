import { toJaTimeString } from '@trend-diary/common/locale/date'
import type { ReactNode } from 'react'
import { Skeleton } from '@/client/components/shadcn/skeleton'
import { AnchorLink } from '@/client/components/ui/navigation/link'
// barrel 経由だと記事スライスのデータ取得 hook（swr 依存）まで巻き込み、Storybook 環境で読み込みに失敗するため
import MediaIcon from '@/client/features/article/components/media-icon'
import type { ReadItem } from '@/client/features/diary/model/types'
import { toSafeExternalPath } from '@/client/lib/url'

interface Props {
  isLoading: boolean
  shouldShowDailyDetails: boolean
  reads: ReadItem[]
  emptyState?: ReactNode
}

export default function DiaryReadListSection({
  isLoading,
  shouldShowDailyDetails,
  reads,
  emptyState,
}: Props) {
  return (
    <div className='mt-6'>
      <h2 className='text-sm font-semibold text-gray-700'>読了した記事一覧</h2>
      {isLoading &&
        shouldShowDailyDetails && (
          // ul に role=status を付けると list セマンティクスを上書きし li が孤立するため、div のラッパーに分離する
          <div role='status' aria-label='読み込み中' data-slot='diary-read-list-skeleton'>
            {/* 視覚的なプレースホルダーは支援技術から隠し、状態通知は親の role=status に集約する */}
            <div aria-hidden='true' className='mt-2 space-y-2'>
              {['s1', 's2', 's3'].map((key) => (
                <div key={key} className='flex items-center justify-between gap-3'>
                  <div className='flex min-w-0 flex-1 items-center gap-2'>
                    <Skeleton className='h-4 w-4 shrink-0 rounded-sm' />
                    <Skeleton className='h-4 w-2/3' />
                  </div>
                  <Skeleton className='h-3 w-12 shrink-0' />
                </div>
              ))}
            </div>
          </div>
        )}
      {!isLoading && (!shouldShowDailyDetails || reads.length === 0) && emptyState}
      {!isLoading && shouldShowDailyDetails && reads.length > 0 && (
        <ul className='mt-2 space-y-2 text-sm' data-slot='diary-read-list'>
          {reads.map((read) => {
            const safeUrl = toSafeExternalPath(read.url)

            return (
              <li
                key={read.readHistoryId}
                className='flex items-center justify-between gap-3 text-gray-800'
              >
                <div className='flex min-w-0 flex-1 items-center gap-2'>
                  <MediaIcon media={read.media} size='sm' />
                  {safeUrl ? (
                    <AnchorLink
                      to={safeUrl}
                      className='block truncate text-blue-700 underline hover:text-blue-800'
                    >
                      {read.title}
                    </AnchorLink>
                  ) : (
                    <span className='block truncate text-gray-700'>{read.title}</span>
                  )}
                </div>
                <p className='shrink-0 text-xs text-gray-500'>{toJaTimeString(read.readAt)}</p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
