import { isArticleMedia } from '@trend-diary/domain/article/media'
import { Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardTitle } from '@/client/components/shadcn/card'
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

  // Enter / Space での起動を担保する。role='button' の div はネイティブ button と違い
  // キー操作でクリックが発火しないため、明示的にハンドリングする。Space は既定のスクロールを止める
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onCardClick(article)
    }
  }

  return (
    // 既読トグルをカードの内側に置くとインタラクティブ要素の入れ子になるため、
    // 兄弟要素として重ね、DOM 上のネストを避ける
    <div className='group relative h-32 w-full sm:w-64'>
      <Card
        data-slot='card'
        data-testid='article-card'
        // 既読トグルは兄弟要素として重なるため、その上をホバーするとカードの :hover が外れてしまう。
        // group-hover にしてラッパー全体のホバーで影を維持し、ちらつきを防ぐ
        className={cn(
          'size-full cursor-pointer rounded-3xl border border-white/40 bg-white/30 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 group-hover:shadow-xl focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none',
          isRead && 'opacity-60',
        )}
        onClick={() => onCardClick(article)}
        onKeyDown={handleKeyDown}
        role='button'
        tabIndex={0}
      >
        <CardContent className='flex h-full flex-col p-0'>
          <CardTitle className='line-clamp-2 flex-1 text-sm leading-relaxed font-bold text-gray-700'>
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
          </CardTitle>

          {/* 既読トグルは absolute で右下に重なるため、著者名が潜り込まないよう右側を空ける */}
          <CardDescription className={cn('mt-3 flex items-end', isLoggedIn && 'pr-16')}>
            <span className='min-w-0 truncate text-sm text-gray-600'>{article.author}</span>
          </CardDescription>
        </CardContent>
      </Card>

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
