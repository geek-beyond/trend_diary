import type { ArticleMedia } from '@trend-diary/domain/article/media'

export type MediaType = ArticleMedia
type IconSize = 'sm' | 'md'

const mediaConfig: Record<MediaType, { iconImage: string; altText: string }> = {
  qiita: {
    iconImage: '/images/qiita-icon.png',
    altText: 'qiita icon',
  },
  zenn: {
    iconImage: '/images/zenn-icon.svg',
    altText: 'zenn icon',
  },
  hatena: {
    iconImage: '/images/hatena-icon.svg',
    altText: 'hatena icon',
  },
}

interface Props {
  media: MediaType
  size?: IconSize
}

const iconSizeClassMap: Record<IconSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
}

export default function MediaIcon({ media, size = 'md' }: Props) {
  const config = mediaConfig[media]
  const sizeClass = iconSizeClassMap[size]

  return (
    <img
      src={config.iconImage}
      alt={config.altText}
      className={`inline-block ${sizeClass} rounded-sm align-middle`}
    />
  )
}
