import { faker } from '@faker-js/faker'
import { toJstDateString } from '@trend-diary/common/locale/date'
import { articles, readHistories, skippedArticles } from '@trend-diary/datastore/drizzle-orm/schema'
import type { RdbClient } from '@trend-diary/datastore/rdb'
import { fromDbId, toDbIds } from '@trend-diary/datastore/rdb/id'
import { inArray } from 'drizzle-orm'
import { ARTICLE_MEDIA, type ArticleMedia } from '@/domain/article/media'

function getTodayJstNoon(): Date {
  const todayJstResult = toJstDateString(new Date())
  const todayJst = todayJstResult.isErr() ? '1970-01-01' : todayJstResult.value
  // trends API は日付フィルタを JST で評価するため、E2E データも JST 当日内に固定する
  return new Date(`${todayJst}T12:00:00+09:00`)
}

export async function createArticle(
  rdb: RdbClient,
  options?: {
    media?: ArticleMedia
    title?: string
    author?: string
    description?: string
    url?: string
    createdAt?: Date
  },
) {
  const media = options?.media ?? faker.helpers.arrayElement(ARTICLE_MEDIA)
  let generatedUrl: string
  if (media === 'qiita') {
    generatedUrl = `https://qiita.com/${faker.internet.username()}/${faker.string.alphanumeric(20)}`
  } else if (media === 'zenn') {
    generatedUrl = `https://zenn.dev/${faker.internet.username()}/${faker.string.alphanumeric(20)}`
  } else {
    generatedUrl = `https://b.hatena.ne.jp/entry/s/${faker.internet.domainName()}/${faker.string.alphanumeric(20)}`
  }
  const url = options?.url ?? generatedUrl
  const uniqueSuffix = `tid-${crypto.randomUUID()}`

  const data = {
    media,
    title: options?.title ?? faker.lorem.sentence().substring(0, 100),
    author: options?.author ?? faker.person.fullName().substring(0, 30),
    description: options?.description ?? faker.lorem.paragraph().substring(0, 255),
    url: url.includes('?') ? `${url}&${uniqueSuffix}` : `${url}?${uniqueSuffix}`,
    createdAt: options?.createdAt ?? getTodayJstNoon(),
  }
  const [article] = await rdb.insert(articles).values(data).returning()
  return {
    ...article,
    articleId: fromDbId(article.articleId),
  }
}

export async function cleanUp(rdb: RdbClient, articleIds: bigint[]): Promise<void> {
  if (articleIds.length === 0) return
  const dbArticleIds = toDbIds(articleIds)
  await rdb.delete(skippedArticles).where(inArray(skippedArticles.articleId, dbArticleIds))
  await rdb.delete(readHistories).where(inArray(readHistories.articleId, dbArticleIds))
  await rdb.delete(articles).where(inArray(articles.articleId, dbArticleIds))
}
