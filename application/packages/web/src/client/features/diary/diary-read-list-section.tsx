import { toJaTimeString } from '@trend-diary/common/locale/date'
import type { ReactNode } from 'react'
import { AnchorLink } from '@/client/components/ui/link'
import type { ReadItem } from '@/client/features/diary/types'
import { toSafeExternalPath } from '@/client/lib/url'
import MediaIcon from '@/client/routes/trends._index/components/media-icon'

type Props = {
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
      {isLoading && shouldShowDailyDetails && (
        <p className='mt-2 text-sm text-gray-500'>読み込み中...</p>
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
