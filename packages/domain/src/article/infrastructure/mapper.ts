import { fromDbId } from '@trend-diary/datastore/rdb/id'
import type { Article as RdbArticle } from '@trend-diary/datastore/schema'
import { assertArticleMedia } from '../media'
import type { Article } from '../schema/article-schema'

export default function fromRdbToArticle(rdbArticle: RdbArticle): Article {
  assertArticleMedia(rdbArticle.media, 'Article row')
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
