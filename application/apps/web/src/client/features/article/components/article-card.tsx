import { isArticleMedia } from '@trend-diary/domain/article/media'
import { Check } from 'lucide-react'
import { cn } from '@/client/components/shadcn/lib/utils'
import type { Article } from '@/client/features/article/hooks/use-articles'
import MediaIcon, { type MediaType } from './media-icon'

interface Props {
  article: Article
  onCardClick: (article: Article) => void
  onToggleRead?: (articleId: string, isRead: boolean) => void
  isLoggedIn?: boolean
}

const toMediaType = (media: string): MediaType => {
  if (isArticleMedia(media)) return media
  return 'zenn'
}

export default function ArticleCard({
  article,
  onCardClick,
  onToggleRead,
  isLoggedIn = false,
}: Props) {
  const isRead = article.isRead ?? false

  const handleToggleRead = () => {
    onToggleRead?.(article.articleId, !isRead)
  }

  return (
    // 既読トグルをカード（button）の内側に置くとインタラクティブ要素の入れ子になるため、
    // 兄弟要素として重ねて DOM 上のネストを避ける。ラッパーの group hover でカードの影を維持する
    <div className='group relative h-32 w-full sm:w-64'>
      {/* ネイティブ button にすることで Enter/Space での起動・フォーカス・role を標準で得る */}
      <button
        type='button'
        data-testid='article-card'
        onClick={() => onCardClick(article)}
        className={cn(
          'size-full cursor-pointer rounded-3xl border border-white/40 bg-white/30 p-6 text-left shadow-2xl backdrop-blur-xl transition-all duration-300 group-hover:shadow-xl focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
          isRead && 'opacity-60',
        )}
      >
        <span className='flex h-full flex-col'>
          <span className='line-clamp-2 flex-1 text-sm leading-relaxed font-bold text-gray-700'>
            <MediaIcon media={toMediaType(article.media)} size='sm' />
            <span className='ml-1'>{article.title}</span>
            {isRead && (
              <span
                data-testid='read-indicator'
                className='ml-1 inline-flex items-center text-green-600'
              >
                <Check className='h-4 w-4' />
                <span className='sr-only'>（既読）</span>
              </span>
            )}
          </span>

          {/* 既読トグルは absolute で右下に重なるため、著者名が潜り込まないよう右側を空ける */}
          <span className={cn('mt-3 flex items-end', isLoggedIn && 'pr-16')}>
            <span className='min-w-0 truncate text-sm text-gray-600'>{article.author}</span>
          </span>
        </span>
      </button>

      {isLoggedIn && (
        <button
          type='button'
          onClick={handleToggleRead}
          // 一覧に多数のカードが並ぶため、ラベルだけだとどの記事への操作か判別できない。
          // 記事タイトルを含めて支援技術に文脈を伝える
          aria-label={`${article.title}を${isRead ? '未読' : '既読'}にする`}
          className='absolute right-6 bottom-6 z-10 text-xs text-gray-500 underline hover:text-gray-700'
        >
          {isRead ? '未読にする' : '既読にする'}
        </button>
      )}
    </div>
  )
}
