import { faker } from '@faker-js/faker'
import { fromDbId, toDbId, toDbIds } from '@trend-diary/datastore/rdb/id'
import { articles, readHistories, skippedArticles } from '@trend-diary/datastore/schema'
import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import { toJstDateString } from '@trend-diary/std/locale/date'
import { and, count, eq, inArray } from 'drizzle-orm'
import { testRdb as rdb } from './rdb'

function getTodayJstNoon(): Date {
  const todayJst = toJstDateString(new Date())
  // INFO: trends APIは日付フィルタをJSTで評価するため、E2EデータもJST当日内に固定する
  return new Date(`${todayJst}T12:00:00+09:00`)
}

const articleUrlByMedia: Record<ArticleMedia, () => string> = {
  qiita: () => `https://qiita.com/${faker.internet.username()}/${faker.string.alphanumeric(20)}`,
  zenn: () => `https://zenn.dev/${faker.internet.username()}/${faker.string.alphanumeric(20)}`,
  hatena: () =>
    `https://b.hatena.ne.jp/entry/s/${faker.internet.domainName()}/${faker.string.alphanumeric(20)}`,
}

export async function createArticle(options?: {
  media?: ArticleMedia
  title?: string
  author?: string
  description?: string
  url?: string
  createdAt?: Date
}) {
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

export async function deleteArticle(articleId: bigint): Promise<void> {
  const dbArticleId = toDbId(articleId)
  await rdb.delete(readHistories).where(eq(readHistories.articleId, dbArticleId))
  await rdb.delete(skippedArticles).where(eq(skippedArticles.articleId, dbArticleId))
  await rdb.delete(articles).where(eq(articles.articleId, dbArticleId))
}

export async function findReadHistory(
  activeUserId: bigint,
  articleId: bigint,
): Promise<{ readHistoryId: bigint; readAt: Date } | null> {
  const [readHistory] = await rdb
    .select({
      readHistoryId: readHistories.readHistoryId,
      readAt: readHistories.readAt,
    })
    .from(readHistories)
    .where(
      and(
        eq(readHistories.activeUserId, toDbId(activeUserId)),
        eq(readHistories.articleId, toDbId(articleId)),
      ),
    )
    .limit(1)
  if (!readHistory) return null
  return {
    ...readHistory,
    readHistoryId: fromDbId(readHistory.readHistoryId),
  }
}

export async function createReadHistory(activeUserId: bigint, articleId: bigint, readAt?: Date) {
  const [readHistory] = await rdb
    .insert(readHistories)
    .values({
      activeUserId: toDbId(activeUserId),
      articleId: toDbId(articleId),
      readAt: readAt || faker.date.recent(),
    })
    .returning()
  return {
    ...readHistory,
    readHistoryId: fromDbId(readHistory.readHistoryId),
    activeUserId: fromDbId(readHistory.activeUserId),
    articleId: fromDbId(readHistory.articleId),
  }
}

export async function deleteReadHistory(activeUserId: bigint, articleId: bigint): Promise<void> {
  await rdb
    .delete(readHistories)
    .where(
      and(
        eq(readHistories.activeUserId, toDbId(activeUserId)),
        eq(readHistories.articleId, toDbId(articleId)),
      ),
    )
}

export async function createSkippedArticle(activeUserId: bigint, articleId: bigint) {
  const [skippedArticle] = await rdb
    .insert(skippedArticles)
    .values({
      activeUserId: toDbId(activeUserId),
      articleId: toDbId(articleId),
    })
    .returning()
  return {
    ...skippedArticle,
    skippedArticleId: fromDbId(skippedArticle.skippedArticleId),
    activeUserId: fromDbId(skippedArticle.activeUserId),
    articleId: fromDbId(skippedArticle.articleId),
  }
}

export async function countReadHistories(activeUserId: bigint, articleId: bigint): Promise<number> {
  const [result] = await rdb
    .select({ value: count() })
    .from(readHistories)
    .where(
      and(
        eq(readHistories.activeUserId, toDbId(activeUserId)),
        eq(readHistories.articleId, toDbId(articleId)),
      ),
    )
  return result.value
}

export async function countSkippedArticles(
  activeUserId: bigint,
  articleId: bigint,
): Promise<number> {
  const [result] = await rdb
    .select({ value: count() })
    .from(skippedArticles)
    .where(
      and(
        eq(skippedArticles.activeUserId, toDbId(activeUserId)),
        eq(skippedArticles.articleId, toDbId(articleId)),
      ),
    )
  return result.value
}

export async function cleanUp(articleIds: bigint[]): Promise<void> {
  if (articleIds.length > 0) {
    const dbArticleIds = toDbIds(articleIds)
    await rdb.delete(skippedArticles).where(inArray(skippedArticles.articleId, dbArticleIds))
    await rdb.delete(readHistories).where(inArray(readHistories.articleId, dbArticleIds))
    await rdb.delete(articles).where(inArray(articles.articleId, dbArticleIds))
  }
}
