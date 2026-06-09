import type { ArticleMedia } from '@trend-diary/domain/article/media'

export interface Source {
  media: ArticleMedia
  read: number
  skip: number
}

export interface ReadItem {
  readHistoryId: string
  articleId: string
  media: ArticleMedia
  title: string
  url: string
  readAt: Date
}

export interface Summary {
  read: number
  skip: number
}

export interface ReadPagination {
  page: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}
