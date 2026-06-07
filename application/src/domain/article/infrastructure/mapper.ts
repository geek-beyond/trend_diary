import type { Article as RdbArticle } from '@trend-diary/datastore/drizzle-orm/schema'
import { fromDbId } from '@trend-diary/datastore/rdb/id'
import type { Article } from '@/domain/article/schema/article-schema'

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
