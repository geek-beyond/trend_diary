import { ARTICLE_MEDIA_LABELS } from '@trend-diary/domain/article/media'
import { ToggleGroup, type ToggleOption } from '@/client/components/ui/input/toggle-group'
import type { MediaType } from '@/client/features/article/hooks/use-articles'

interface Props {
  selectedMedia: MediaType
  onMediaChange: (media: MediaType) => void
}

const mediaOptions: ToggleOption<MediaType>[] = [
  { value: undefined, label: 'すべて', dataSlot: 'media-filter-all' },
  { value: 'qiita', label: ARTICLE_MEDIA_LABELS.qiita, dataSlot: 'media-filter-qiita' },
  { value: 'zenn', label: ARTICLE_MEDIA_LABELS.zenn, dataSlot: 'media-filter-zenn' },
  { value: 'hatena', label: ARTICLE_MEDIA_LABELS.hatena, dataSlot: 'media-filter-hatena' },
]

export default function MediaFilter({ selectedMedia, onMediaChange }: Props) {
  return (
    <ToggleGroup
      options={mediaOptions}
      selectedValue={selectedMedia}
      onSelect={onMediaChange}
      dataSlot='media-filter'
    />
  )
}
