import type {
  ArticleOutput,
  ArticleWithOptionalReadStatus,
} from '@trend-diary/domain/article/schema/article-schema'

export type ArticleResponse = Omit<ArticleOutput, 'articleId'> & {
  articleId: string
  isRead?: boolean
}

// isRead を持たない記事（未読消化など）でも undefined としてそのまま吸収できるようにしている
export function toArticleResponse(article: ArticleWithOptionalReadStatus): ArticleResponse {
  return {
    articleId: article.articleId.toString(),
    media: article.media,
    title: article.title,
    author: article.author,
    description: article.description,
    url: article.url,
    createdAt: article.createdAt,
    isRead: article.isRead,
  }
}
