import { faker } from '@faker-js/faker'
import { and, count, eq, inArray } from 'drizzle-orm'
import { toJstDateString } from '@/common/locale/date'
import { ARTICLE_MEDIA, type ArticleMedia } from '@/domain/article/media'
import { articles, readHistories, skippedArticles } from '@/infrastructure/drizzle-orm/schema'
import { fromDbId, toDbId, toDbIds } from '@/infrastructure/rdb/id'
import { getTestRdb } from './rdb'

function getTodayJstNoon(): Date {
  const todayJstResult = toJstDateString(new Date())
  const todayJst = todayJstResult.isErr() ? '1970-01-01' : todayJstResult.value
  // INFO: trends APIは日付フィルタをJSTで評価するため、E2EデータもJST当日内に固定する
  return new Date(`${todayJst}T12:00:00+09:00`)
}

export async function createArticle(options?: {
  media?: ArticleMedia
  title?: string
  author?: string
  description?: string
  url?: string
  createdAt?: Date
}) {
  const rdb = getTestRdb()
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

export async function deleteArticle(articleId: bigint): Promise<void> {
  const rdb = getTestRdb()
  const dbArticleId = toDbId(articleId)
  await rdb.delete(readHistories).where(eq(readHistories.articleId, dbArticleId))
  await rdb.delete(skippedArticles).where(eq(skippedArticles.articleId, dbArticleId))
  await rdb.delete(articles).where(eq(articles.articleId, dbArticleId))
}

export async function findReadHistory(
  activeUserId: bigint,
  articleId: bigint,
): Promise<{ readHistoryId: bigint; readAt: Date } | null> {
  const rdb = getTestRdb()
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
  const rdb = getTestRdb()
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
  const rdb = getTestRdb()
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
  const rdb = getTestRdb()
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
  const rdb = getTestRdb()
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

export async function cleanUp(articleIds: bigint[]): Promise<void> {
  const rdb = getTestRdb()
  if (articleIds.length > 0) {
    const dbArticleIds = toDbIds(articleIds)
    await rdb.delete(skippedArticles).where(inArray(skippedArticles.articleId, dbArticleIds))
    await rdb.delete(readHistories).where(inArray(readHistories.articleId, dbArticleIds))
    await rdb.delete(articles).where(inArray(articles.articleId, dbArticleIds))
  }
}
