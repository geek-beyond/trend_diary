import type { ArticleMedia } from '@trend-diary/domain/article/media'

export type Source = {
  media: ArticleMedia
  read: number
  skip: number
}

export type ReadItem = {
  readHistoryId: string
  articleId: string
  media: ArticleMedia
  title: string
  url: string
  readAt: Date
}

export type Summary = {
  read: number
  skip: number
}

export type ReadPagination = {
  page: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
