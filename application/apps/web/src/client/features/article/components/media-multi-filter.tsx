import {
  ARTICLE_MEDIA,
  ARTICLE_MEDIA_LABELS,
  type ArticleMedia,
} from '@trend-diary/domain/article/media'
import { ToggleButton } from '@/client/components/ui/input/toggle-button'
import type { SelectedMedia } from '@/client/features/article/hooks/use-articles'

interface Props {
  selectedMedia: SelectedMedia
  onMediaChange: (media: SelectedMedia) => void
}

export default function MediaMultiFilter({ selectedMedia, onMediaChange }: Props) {
  const selected = selectedMedia ?? []

  const toggleMedia = (media: ArticleMedia) => {
    const next = selected.includes(media)
      ? selected.filter((item) => item !== media)
      : [...selected, media]
    // 未選択（すべて）は undefined で表す
    onMediaChange(next.length > 0 ? next : undefined)
  }

  return (
    <div className='flex flex-wrap items-center gap-2' data-slot='media-filter' role='group'>
      <ToggleButton
        label='すべて'
        dataSlot='media-filter-all'
        isSelected={selected.length === 0}
        onClick={() => onMediaChange(undefined)}
      />
      {ARTICLE_MEDIA.map((media) => (
        <ToggleButton
          key={media}
          label={ARTICLE_MEDIA_LABELS[media]}
          dataSlot={`media-filter-${media}`}
          isSelected={selected.includes(media)}
          onClick={() => toggleMedia(media)}
        />
      ))}
    </div>
  )
}
