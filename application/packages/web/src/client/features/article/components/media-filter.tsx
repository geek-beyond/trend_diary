import { ARTICLE_MEDIA_LABELS, type ArticleMedia } from '@trend-diary/domain/article/media'
import { Button } from '@/client/components/shadcn/button'
import { cn } from '@/client/components/shadcn/lib/utils'

export type MediaType = ArticleMedia | null

interface Props {
  selectedMedia: MediaType
  onMediaChange: (media: MediaType) => void
}

const mediaOptions = [
  { value: null, label: 'すべて', dataSlot: 'media-filter-all' },
  { value: 'qiita', label: ARTICLE_MEDIA_LABELS.qiita, dataSlot: 'media-filter-qiita' },
  { value: 'zenn', label: ARTICLE_MEDIA_LABELS.zenn, dataSlot: 'media-filter-zenn' },
  { value: 'hatena', label: ARTICLE_MEDIA_LABELS.hatena, dataSlot: 'media-filter-hatena' },
] as const

export default function MediaFilter({ selectedMedia, onMediaChange }: Props) {
  return (
    <div className='flex flex-wrap items-center gap-2' data-slot='media-filter'>
      {mediaOptions.map((option) => {
        const isSelected = selectedMedia === option.value
        return (
          <Button
            key={option.dataSlot}
            type='button'
            variant='outline'
            className={cn(
              'border-gray-300 text-gray-700 hover:bg-gray-100',
              isSelected && 'border-blue-600 bg-blue-50 text-blue-700 hover:bg-blue-100',
            )}
            onClick={() => onMediaChange(option.value)}
            data-slot={option.dataSlot}
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
