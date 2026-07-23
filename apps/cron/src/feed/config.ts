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
})

export interface FeedConfig<RawItem> {
  url: string
  mapItem: (item: RawItem) => NormalizedItem
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
}

interface HatenaRawItem extends RawFeedItem {
  creator?: string
  content?: string
  'content:encoded'?: string
  contentSnippet?: string
}

export const FEED_CONFIGS = {
  qiita: {
    url: FEED_URL.qiita,
    mapItem: (item: QiitaRawItem) => ({
      title: item.title,
      author: item.author,
      description: item.content,
      url: item.link,
    }),
  } satisfies FeedConfig<QiitaRawItem>,
  zenn: {
    url: FEED_URL.zenn,
    mapItem: (item: ZennRawItem) => ({
      title: item.title,
      author: item.creator,
      description: item.content,
      url: item.link,
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
    }),
  } satisfies FeedConfig<HatenaRawItem>,
}
