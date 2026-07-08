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

  return (
    <Card
      data-slot='card'
      data-testid='article-card'
      className={cn(
        'relative h-32 w-full sm:w-64 rounded-3xl border border-white/40 bg-white/30 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-xl',
        isRead && 'opacity-60',
      )}
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
            </span>
          )}
        </CardTitle>

        <CardDescription className='mt-3 flex items-end justify-between'>
          <span className='text-sm text-gray-600'>{article.author}</span>
          {isLoggedIn && (
            <button
              type='button'
              onClick={handleToggleRead}
              className='relative z-10 text-xs text-gray-500 hover:text-gray-700 underline'
            >
              {isRead ? '未読にする' : '既読にする'}
            </button>
          )}
        </CardDescription>
      </CardContent>

      {/* カード全面を覆うトリガを兄弟要素にし、既読トグルと入れ子にせず両方を独立した操作要素にする */}
      <button
        type='button'
        onClick={() => onCardClick(article)}
        aria-label={`${article.title}を開く`}
        className='absolute inset-0 z-0 cursor-pointer rounded-3xl'
      />
    </Card>
  )
}
