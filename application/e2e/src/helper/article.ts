import { faker } from '@faker-js/faker'
import type { RdbClient } from '@trend-diary/datastore/rdb'
import { fromDbId, toDbIds } from '@trend-diary/datastore/rdb/id'
import { articles, readHistories, skippedArticles } from '@trend-diary/datastore/schema'
import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import { toJstDateString } from '@trend-diary/std/locale/date'
import { inArray } from 'drizzle-orm'

function getTodayJstNoon(): Date {
  const todayJst = toJstDateString(new Date())
  // trends API は日付フィルタを JST で評価するため、E2E データも JST 当日内に固定する
  return new Date(`${todayJst}T12:00:00+09:00`)
}

const articleUrlByMedia: Record<ArticleMedia, () => string> = {
  qiita: () => `https://qiita.com/${faker.internet.username()}/${faker.string.alphanumeric(20)}`,
  zenn: () => `https://zenn.dev/${faker.internet.username()}/${faker.string.alphanumeric(20)}`,
  hatena: () =>
    `https://b.hatena.ne.jp/entry/s/${faker.internet.domainName()}/${faker.string.alphanumeric(20)}`,
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
  const {
    media = faker.helpers.arrayElement(ARTICLE_MEDIA),
    url,
    title = faker.lorem.sentence().substring(0, 100),
    author = faker.person.fullName().substring(0, 30),
    description = faker.lorem.paragraph().substring(0, 255),
    createdAt = getTodayJstNoon(),
  } = options ?? {}
  const baseUrl = url ?? articleUrlByMedia[media]()
  const uniqueSuffix = `tid-${crypto.randomUUID()}`

  const data = {
    media,
    title,
    author,
    description,
    url: baseUrl.includes('?') ? `${baseUrl}&${uniqueSuffix}` : `${baseUrl}?${uniqueSuffix}`,
    createdAt,
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
