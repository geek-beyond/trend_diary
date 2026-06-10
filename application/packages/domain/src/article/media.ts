export const ARTICLE_MEDIA = ['qiita', 'zenn', 'hatena'] as const

export type ArticleMedia = (typeof ARTICLE_MEDIA)[number]

export const ARTICLE_MEDIA_LABELS: Record<ArticleMedia, string> = {
  qiita: 'Qiita',
  zenn: 'Zenn',
  hatena: 'はてブ',
}

const ARTICLE_MEDIA_SET: ReadonlySet<string> = new Set(ARTICLE_MEDIA)

export function isArticleMedia(value: string): value is ArticleMedia {
  return ARTICLE_MEDIA_SET.has(value)
}
