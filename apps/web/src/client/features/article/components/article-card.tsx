import { Check } from 'lucide-react'
import { Card, CardContent, CardDescription, CardTitle } from '@/client/components/shadcn/card'
import { cn } from '@/client/components/shadcn/lib/utils'
import type { Article } from '@/client/features/article/hooks/use-articles'
import { ARTICLE_CARD_FRAME_CLASS, ARTICLE_THUMBNAIL_FRAME_CLASS } from './article-card-frame'
import ArticleThumbnail from './article-thumbnail'
import MediaIcon, { toMediaType } from './media-icon'

interface Props {
  article: Article
  onCardClick: (article: Article) => void
  onToggleRead?: (articleId: string, isRead: boolean) => void
  isLoggedIn?: boolean
}

export default function ArticleCard({
  article,
  onCardClick,
  onToggleRead,
  isLoggedIn = false,
}: Props) {
  const isRead = article.isRead ?? false
  const mediaType = toMediaType(article.media)

  const handleToggleRead = () => {
    onToggleRead?.(article.articleId, !isRead)
  }

  return (
    <Card
      data-slot='card'
      data-testid='article-card'
      className={cn(
        ARTICLE_CARD_FRAME_CLASS,
        'relative transition-all duration-300 hover:shadow-xl',
        isRead && 'opacity-60',
      )}
    >
      {/* カード全面を覆うトリガを兄弟要素にし、既読トグルと入れ子にせず両方を独立した操作要素にする。
          主要操作を先にフォーカスさせるため既読トグルより DOM 上で前に置く（absolute のため描画順は不変） */}
      <button
        type='button'
        onClick={() => onCardClick(article)}
        aria-label={`記事「${article.title}」を開く`}
        className='absolute inset-0 z-0 cursor-pointer rounded-3xl outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
      />

      <div className={ARTICLE_THUMBNAIL_FRAME_CLASS}>
        <ArticleThumbnail media={mediaType} ogImageUrl={article.ogImageUrl} />
      </div>

      <CardContent className='flex min-h-0 flex-1 flex-col p-4'>
        <CardTitle className='line-clamp-2 flex-1 text-sm leading-relaxed font-bold text-foreground'>
          <MediaIcon media={mediaType} size='sm' />
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
          <span className='text-sm text-muted-foreground'>{article.author}</span>
          {isLoggedIn && (
            <button
              type='button'
              onClick={handleToggleRead}
              className='relative z-10 text-xs text-muted-foreground hover:text-foreground underline'
            >
              {isRead ? '未読にする' : '既読にする'}
            </button>
          )}
        </CardDescription>
      </CardContent>
    </Card>
  )
}
