import {
  ARTICLE_MEDIA,
  ARTICLE_MEDIA_LABELS,
  type ArticleMedia,
} from '@trend-diary/domain/article/media'
import { ToggleButton } from '@/client/components/ui/input/toggle-button'
import {
  ALL_MEDIA,
  isAllMediaSelected,
  type SelectedMedia,
} from '@/client/features/article/hooks/use-articles'

interface Props {
  selectedMedia: SelectedMedia
  onMediaChange: (media: SelectedMedia) => void
}

export default function MediaMultiFilter({ selectedMedia, onMediaChange }: Props) {
  const toggleMedia = (media: ArticleMedia) => {
    const next = selectedMedia.includes(media)
      ? selectedMedia.filter((item) => item !== media)
      : [...selectedMedia, media]
    // 1件も選ばれていない状態は作らず、全解除は「すべて」（全メディア選択）に戻す
    onMediaChange(next.length > 0 ? next : ALL_MEDIA)
  }

  return (
    <div className='flex flex-wrap items-center gap-2' data-slot='media-filter' role='group'>
      <ToggleButton
        label='すべて'
        dataSlot='media-filter-all'
        isSelected={isAllMediaSelected(selectedMedia)}
        onClick={() => onMediaChange(ALL_MEDIA)}
      />
      {ARTICLE_MEDIA.map((media) => (
        <ToggleButton
          key={media}
          label={ARTICLE_MEDIA_LABELS[media]}
          dataSlot={`media-filter-${media}`}
          isSelected={selectedMedia.includes(media)}
          onClick={() => toggleMedia(media)}
        />
      ))}
    </div>
  )
}
