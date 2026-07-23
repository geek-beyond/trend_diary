import { ARTICLE_MAX_LENGTH } from '@trend-diary/domain/article/schema/article-schema'
import extractTrimmed from '@trend-diary/std/sanitization'
import { z } from 'zod'

export const FEED_URL = {
  qiita: 'https://qiita.com/popular-items/feed.atom',
  zenn: 'https://zenn.dev/feed',
  hatena: 'https://b.hatena.ne.jp/hotentry/it.rss',
} as const

const HATENA_FALLBACK_AUTHOR = 'はてなブックマーク'

export interface NormalizedItem {
  title: string
  author: string
  description: string
  url: string
  imageUrl: string | null
}

// 外部フィードは欠落フィールドを undefined / null で返すため、保存前に実行時検証する。
// title / author / url は欠落・空文字なら不正としてスキップ対象にし、
// description は欠落しても致命的でないため空文字で補完する。
const requiredText = z.string().trim().min(1)

export const normalizedItemSchema = z.object({
  title: requiredText,
  author: requiredText,
  description: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  url: requiredText,
  // 画像は装飾用途で記事の有効性に影響しないため、欠落・不正・過長の値は記事ごとスキップせず null に縮退させる。
  // URL は切り詰めると壊れるため、上限超過も切り詰めではなく null に落とす
  imageUrl: z
    .string()
    .url()
    .max(ARTICLE_MAX_LENGTH.imageUrl)
    .nullish()
    .catch(null)
    .transform((value) => value ?? null),
})

export interface FeedConfig<RawItem> {
  url: string
  mapItem: (item: RawItem) => NormalizedItem
  // rss-parser が既定で拾わない名前空間付き要素（hatena:imageurl 等）を必要とするフィードだけ指定する
  itemCustomFields?: (keyof RawItem & string)[]
}

interface RawFeedItem {
  title: string
  link: string
}

interface QiitaRawItem extends RawFeedItem {
  author: string
  content: string
}

interface ZennRawItem extends RawFeedItem {
  creator: string
  content: string
  enclosure?: { url?: string }
}

interface HatenaRawItem extends RawFeedItem {
  creator?: string
  content?: string
  'content:encoded'?: string
  contentSnippet?: string
  'hatena:imageurl'?: string
}

export const FEED_CONFIGS = {
  qiita: {
    url: FEED_URL.qiita,
    // Qiita の Atom フィードは画像要素を持たないため imageUrl は常に null
    mapItem: (item: QiitaRawItem) => ({
      title: item.title,
      author: item.author,
      description: item.content,
      url: item.link,
      imageUrl: null,
    }),
  } satisfies FeedConfig<QiitaRawItem>,
  zenn: {
    url: FEED_URL.zenn,
    mapItem: (item: ZennRawItem) => ({
      title: item.title,
      author: item.creator,
      description: item.content,
      url: item.link,
      imageUrl: item.enclosure?.url ?? null,
    }),
  } satisfies FeedConfig<ZennRawItem>,
  hatena: {
    url: FEED_URL.hatena,
    mapItem: (item: HatenaRawItem) => ({
      title: item.title,
      author: extractTrimmed(item.creator) ?? HATENA_FALLBACK_AUTHOR,
      description:
        extractTrimmed(item.content) ??
        extractTrimmed(item['content:encoded']) ??
        extractTrimmed(item.contentSnippet) ??
        '',
      url: item.link,
      imageUrl: extractTrimmed(item['hatena:imageurl']) ?? null,
    }),
    itemCustomFields: ['hatena:imageurl'],
  } satisfies FeedConfig<HatenaRawItem>,
}
