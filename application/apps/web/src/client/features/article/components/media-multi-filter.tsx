import {
  ARTICLE_MEDIA,
  ARTICLE_MEDIA_LABELS,
  type ArticleMedia,
} from '@trend-diary/domain/article/media'
import { ToggleButton } from '@/client/components/ui/input/toggle-button'
import { type SelectedMedia } from '../model/media-selection'

interface Props {
  selectedMedia: SelectedMedia
  onMediaChange: (media: SelectedMedia) => void
}

export default function MediaMultiFilter({ selectedMedia, onMediaChange }: Props) {
  const toggleMedia = (media: ArticleMedia) => {
    const next = selectedMedia.includes(media)
      ? selectedMedia.filter((item) => item !== media)
      : [...selectedMedia, media]
    // 最後の1件は外せない（空選択を作らない）
    if (next.length > 0) onMediaChange(next)
  }

  return (
    <div className='flex flex-wrap items-center gap-2' role='group'>
      {ARTICLE_MEDIA.map((media) => (
        <ToggleButton
          key={media}
          label={ARTICLE_MEDIA_LABELS[media]}
          isSelected={selectedMedia.includes(media)}
          onClick={() => toggleMedia(media)}
        />
      ))}
    </div>
  )
}
