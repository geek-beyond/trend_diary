import { type ArticleMedia, isArticleMedia } from '@trend-diary/domain/article/media'

export type MediaType = ArticleMedia
type IconSize = 'sm' | 'md'

const FALLBACK_MEDIA: MediaType = 'zenn'

export function toMediaType(media: string): MediaType {
  if (isArticleMedia(media)) return media
  // 未知の media は握りつぶすとデータ不整合が埋もれるため、フォールバック時に検知できるようにする
  // oxlint-disable-next-line no-console -- 想定外の media を運用で気付けるようにする
  console.warn(`未知の media "${media}" を検出したため ${FALLBACK_MEDIA} にフォールバックしました`)
  return FALLBACK_MEDIA
}

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
