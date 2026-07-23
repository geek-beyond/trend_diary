import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'

export type SelectedMedia = ArticleMedia[]

export const ALL_MEDIA: SelectedMedia = [...ARTICLE_MEDIA]

export const isAllMediaSelected = (media: SelectedMedia): boolean =>
  media.length === ARTICLE_MEDIA.length
