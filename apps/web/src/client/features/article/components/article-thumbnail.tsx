import { useState } from 'react'
import { cn } from '@/client/components/shadcn/lib/utils'
import MediaIcon, { type MediaType } from './media-icon'

interface Props {
  media: MediaType
  ogImageUrl: string | null
}

// 画像なしを「欠落」ではなくメディア別のデザインとして見せるため、ブランドカラーのグラデーションを敷く
const placeholderClassMap: Record<MediaType, string> = {
  qiita: 'from-[#55C500]/25 to-[#55C500]/5',
  zenn: 'from-[#3EA8FF]/25 to-[#3EA8FF]/5',
  hatena: 'from-[#00A4DE]/25 to-[#00A4DE]/5',
}

export default function ArticleThumbnail({ media, ogImageUrl }: Props) {
  // 外部画像はリンク切れがあり得るため、読込失敗時はプレースホルダーへ縮退させて枠を保つ
  const [isImageBroken, setIsImageBroken] = useState(false)

  if (ogImageUrl === null || isImageBroken) {
    return (
      <div
        data-testid='article-thumbnail-placeholder'
        // メディア種別はタイトル横のアイコンで伝わるため、装飾のプレースホルダーは支援技術から隠す
        aria-hidden='true'
        className={cn(
          'flex h-full w-full items-center justify-center bg-gradient-to-br',
          placeholderClassMap[media],
        )}
      >
        <MediaIcon media={media} size='lg' />
      </div>
    )
  }

  return (
    <img
      data-testid='article-thumbnail-image'
      src={ogImageUrl}
      // OGP画像は装飾用途でタイトルがテキストとして併記されるため、代替テキストは空にする
      alt=''
      loading='lazy'
      onError={() => setIsImageBroken(true)}
      className='h-full w-full object-cover'
    />
  )
}
