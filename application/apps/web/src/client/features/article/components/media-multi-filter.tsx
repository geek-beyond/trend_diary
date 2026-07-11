import {
  ARTICLE_MEDIA,
  ARTICLE_MEDIA_LABELS,
  type ArticleMedia,
} from '@trend-diary/domain/article/media'
import { ToggleButton } from '@/client/components/ui/input/toggle-button'
import { ALL_MEDIA, isAllMediaSelected, type SelectedMedia } from '../media-selection'

interface Props {
  selectedMedia: SelectedMedia
  onMediaChange: (media: SelectedMedia) => void
}

export default function MediaMultiFilter({ selectedMedia, onMediaChange }: Props) {
  const toggleMedia = (media: ArticleMedia) => {
    const next = selectedMedia.includes(media)
      ? selectedMedia.filter((item) => item !== media)
      : [...selectedMedia, media]
    // 最後の1件を外すと空になるため、その場合は「すべて」に戻して空の選択を作らない
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
