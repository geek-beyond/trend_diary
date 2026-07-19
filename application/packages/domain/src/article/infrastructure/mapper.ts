import type { Article as RdbArticle } from '@trend-diary/datastore/drizzle-orm/schema'
import { fromDbId } from '@trend-diary/datastore/rdb/id'
import { isArticleMedia } from '../media'
import type { Article } from '../schema/article-schema'

export default function fromRdbToArticle(rdbArticle: RdbArticle): Article {
  // DBのmediaカラムは任意文字列のため、未知の値＝データ破損をクライアントへ静かに配信しないよう検証する
  if (!isArticleMedia(rdbArticle.media)) {
    throw new Error(`Article row has unknown media: ${rdbArticle.media}`)
  }
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
