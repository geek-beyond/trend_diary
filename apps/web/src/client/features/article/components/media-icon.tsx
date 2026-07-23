import { type ArticleMedia, assertArticleMedia } from '@trend-diary/domain/article/media'

export type MediaType = ArticleMedia
type IconSize = 'sm' | 'md' | 'lg'

export function toMediaType(media: string): MediaType {
  // 別媒体のアイコンに化けさせると誤表示が正常に見えて発見が遅れるため、フォールバックせず送出する
  assertArticleMedia(media, 'Article')
  return media
}

const mediaConfig: Record<MediaType, { iconImage: string; altText: string }> = {
  qiita: {
    iconImage: '/images/qiita-icon.png',
    altText: 'Qiitaのアイコン',
  },
  zenn: {
    iconImage: '/images/zenn-icon.svg',
    altText: 'Zennのアイコン',
  },
  hatena: {
    iconImage: '/images/hatena-icon.svg',
    altText: 'はてなのアイコン',
  },
}

interface Props {
  media: MediaType
  size?: IconSize
}

const iconSizeClassMap: Record<IconSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-10 w-10',
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
