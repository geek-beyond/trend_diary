import { ServerError } from '@/common/errors'
import { AsyncResult, failure, isFailure, success, wrapAsyncCall } from '@/common/result'
import { Command } from '@/domain/article/repository'
import type { ReadHistory } from '@/domain/article/schema/read-history-schema'
import type { SkippedArticle } from '@/domain/article/schema/skipped-article-schema'
import { RdbClient } from '@/infrastructure/rdb'
import { fromDbId, toDbId } from '@/infrastructure/rdb-id'

export default class CommandImpl implements Command {
  constructor(private readonly db: RdbClient) {}

  async createReadHistory(
    activeUserId: bigint,
    articleId: bigint,
    readAt: Date,
  ): AsyncResult<ReadHistory, Error> {
    const dbActiveUserId = toDbId(activeUserId)
    const dbArticleId = toDbId(articleId)
    const result = await wrapAsyncCall(() =>
      this.db.readHistory.create({
        data: {
          activeUserId: dbActiveUserId,
          articleId: dbArticleId,
          readAt,
        },
      }),
    )
    if (isFailure(result)) {
      return failure(new ServerError(result.error))
    }

    const createdReadHistory = result.value
    const readHistory: ReadHistory = {
      readHistoryId: fromDbId(createdReadHistory.readHistoryId),
      activeUserId: fromDbId(createdReadHistory.activeUserId),
      articleId: fromDbId(createdReadHistory.articleId),
      readAt: createdReadHistory.readAt,
      createdAt: createdReadHistory.createdAt,
    }
    return success(readHistory)
  }

  async deleteAllReadHistory(activeUserId: bigint, articleId: bigint): AsyncResult<void, Error> {
    const dbActiveUserId = toDbId(activeUserId)
    const dbArticleId = toDbId(articleId)
    const result = await wrapAsyncCall(() =>
      this.db.readHistory.deleteMany({
        where: {
          activeUserId: dbActiveUserId,
          articleId: dbArticleId,
        },
      }),
    )
    if (isFailure(result)) {
      return failure(new ServerError(result.error))
    }

    return success(undefined)
  }

  async createSkippedArticle(
    activeUserId: bigint,
    articleId: bigint,
  ): AsyncResult<SkippedArticle, Error> {
    const dbActiveUserId = toDbId(activeUserId)
    const dbArticleId = toDbId(articleId)

    const result = await wrapAsyncCall(() =>
      this.db.skippedArticle.upsert({
        where: {
          articleIdActiveUserId: {
            articleId: dbArticleId,
            activeUserId: dbActiveUserId,
          },
        },
        update: {},
        create: {
          activeUserId: dbActiveUserId,
          articleId: dbArticleId,
        },
      }),
    )
    if (isFailure(result)) {
      return failure(new ServerError(result.error))
    }

    const skippedArticle = result.value
    return success({
      skippedArticleId: fromDbId(skippedArticle.skippedArticleId),
      activeUserId: fromDbId(skippedArticle.activeUserId),
      articleId: fromDbId(skippedArticle.articleId),
      createdAt: skippedArticle.createdAt,
    })
  }
}
