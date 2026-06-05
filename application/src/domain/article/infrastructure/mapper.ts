import type { Article } from '@/domain/article/schema/article-schema'
import type { Article as RdbArticle } from '@/infrastructure/drizzle-orm/schema'
import { fromDbId } from '@/infrastructure/rdb-id'

export default function fromRdbToArticle(rdbArticle: RdbArticle): Article {
  return {
    articleId: fromDbId(rdbArticle.articleId),
    media: rdbArticle.media,
    title: rdbArticle.title,
    author: rdbArticle.author,
    description: rdbArticle.description,
    url: rdbArticle.url,
    createdAt: rdbArticle.createdAt,
  }
}
