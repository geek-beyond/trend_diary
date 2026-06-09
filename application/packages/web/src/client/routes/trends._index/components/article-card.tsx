import { isArticleMedia } from '@trend-diary/domain/article/media'
import { Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardTitle } from '@/client/components/shadcn/card'
import { cn } from '@/client/components/shadcn/lib/utils'
import type { Article } from '../hooks/use-articles'
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

  const handleToggleRead = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleRead?.(article.articleId, !isRead)
  }

  return (
    <Card
      data-slot='card'
      data-testid='article-card'
      className={cn(
        'h-32 w-full sm:w-64 cursor-pointer rounded-3xl border border-white/40 bg-white/30 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:shadow-xl',
        isRead && 'opacity-60',
      )}
      onClick={() => onCardClick(article)}
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
            </span>
          )}
        </CardTitle>

        <CardDescription className='mt-3 flex items-end justify-between'>
          <span className='text-sm text-gray-600'>{article.author}</span>
          {isLoggedIn && (
            <button
              type='button'
              onClick={handleToggleRead}
              className='text-xs text-gray-500 hover:text-gray-700 underline'
            >
              {isRead ? '未読にする' : '既読にする'}
            </button>
          )}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
