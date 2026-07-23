import { Skeleton } from '@/client/components/shadcn/skeleton'
import { AnchorLink } from '@/client/components/ui/navigation/link'
// barrel 経由だと記事スライスのデータ取得 hook（swr 依存）まで巻き込み、Storybook 環境で読み込みに失敗するため
import MediaIcon from '@/client/features/article/components/media-icon'
import type { ReadItem } from '@/client/features/diary/model/types'
import { toSafeExternalPath } from '@/client/lib/url'
import { toJaTimeString } from '@/common/locale/date'

interface Props {
  isLoading: boolean
  shouldShowDailyDetails: boolean
  reads: ReadItem[]
}

export default function DiaryReadListSection({ isLoading, shouldShowDailyDetails, reads }: Props) {
  return (
    <div className='mt-6'>
      <h2 className='text-sm font-semibold text-foreground'>読了した記事一覧</h2>
      <ReadListContent
        isLoading={isLoading}
        shouldShowDailyDetails={shouldShowDailyDetails}
        reads={reads}
      />
    </div>
  )
}

function ReadListContent({ isLoading, shouldShowDailyDetails, reads }: Props) {
  // 日次詳細を出す場面のみスケルトンを見せる。analytics の日付未選択時（グラフのみ読込中）は一覧領域には何も出さない
  if (isLoading) {
    return shouldShowDailyDetails ? <ReadListSkeleton /> : null
  }
  // 日付未選択（analytics）はグラフからの導線を案内する
  if (!shouldShowDailyDetails) {
    return (
      <p className='mt-2 text-sm text-muted-foreground'>
        グラフの日付をクリックすると、読了記事一覧を表示します。
      </p>
    )
  }
  if (reads.length === 0) {
    return (
      <p className='mt-2 text-sm text-muted-foreground'>
        <span>読了した記事はまだありません。</span>
        <AnchorLink to='/trends' className='ml-1 text-blue-700 underline hover:text-blue-800'>
          トレンド一覧へ
        </AnchorLink>
      </p>
    )
  }
  return (
    <ul className='mt-2 space-y-2 text-sm' data-slot='diary-read-list'>
      {reads.map((read) => {
        const safeUrl = toSafeExternalPath(read.url)

        return (
          <li
            key={read.readHistoryId}
            className='flex items-center justify-between gap-3 text-foreground'
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
                <span className='block truncate text-foreground'>{read.title}</span>
              )}
            </div>
            <p className='shrink-0 text-xs text-muted-foreground'>{toJaTimeString(read.readAt)}</p>
          </li>
        )
      })}
    </ul>
  )
}

function ReadListSkeleton() {
  return (
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
  )
}
