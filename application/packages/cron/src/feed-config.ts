import type { ArticleMedia } from '@trend-diary/domain/article/media'

export const FEED_URL = {
  qiita: 'https://qiita.com/popular-items/feed.atom',
  zenn: 'https://zenn.dev/feed',
  hatena: 'https://b.hatena.ne.jp/hotentry/it.rss',
} as const

const HATENA_FALLBACK_AUTHOR = 'はてなブックマーク'

export type NormalizedItem = {
  title: string
  author: string
  description: string
  url: string
}

export type FeedConfig<RawItem> = {
  url: string
  mapItem: (item: RawItem) => NormalizedItem
}

function pickNonEmpty(...candidates: Array<string | undefined>): string | undefined {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (trimmed.length > 0) return trimmed
  }
  return undefined
}

export const FEED_CONFIGS = {
  qiita: {
    url: FEED_URL.qiita,
    mapItem: (item: { title: string; author: string; content: string; link: string }) => ({
      title: item.title,
      author: item.author,
      description: item.content,
      url: item.link,
    }),
  },
  zenn: {
    url: FEED_URL.zenn,
    mapItem: (item: { title: string; creator: string; content: string; link: string }) => ({
      title: item.title,
      author: item.creator,
      description: item.content,
      url: item.link,
    }),
  },
  hatena: {
    url: FEED_URL.hatena,
    mapItem: (item: {
      title: string
      creator?: string
      content?: string
      'content:encoded'?: string
      contentSnippet?: string
      link: string
    }) => ({
      title: item.title,
      author: pickNonEmpty(item.creator) || HATENA_FALLBACK_AUTHOR,
      description: pickNonEmpty(item.content, item['content:encoded'], item.contentSnippet) || '',
      url: item.link,
    }),
  },
  // biome-ignore lint/suspicious/noExplicitAny: satisfies での網羅検証用。各configのmapItem引数型は保持される
} as const satisfies Record<ArticleMedia, FeedConfig<any>>
