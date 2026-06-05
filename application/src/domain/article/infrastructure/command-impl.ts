import { and, eq } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import { ServerError } from '@/common/errors'
import { wrapAsyncCall } from '@/common/result'
import { Command } from '@/domain/article/repository'
import type { ReadHistory } from '@/domain/article/schema/read-history-schema'
import type { SkippedArticle } from '@/domain/article/schema/skipped-article-schema'
import { readHistories, skippedArticles } from '@/infrastructure/drizzle-orm/schema'
import { RdbClient, unwrapDbError } from '@/infrastructure/rdb'
import { fromDbId, toDbId } from '@/infrastructure/rdb-id'

export default class CommandImpl implements Command {
  constructor(private readonly db: RdbClient) {}

  async createReadHistory(
    activeUserId: bigint,
    articleId: bigint,
    readAt: Date,
  ): Promise<Result<ReadHistory, Error>> {
    const dbActiveUserId = toDbId(activeUserId)
    const dbArticleId = toDbId(articleId)
    const result = await wrapAsyncCall(() =>
      this.db
        .insert(readHistories)
        .values({
          activeUserId: dbActiveUserId,
          articleId: dbArticleId,
          readAt,
        })
        .returning(),
    )
    if (result.isErr()) {
      return err(new ServerError(unwrapDbError(result.error)))
    }

    const createdReadHistory = result.value[0]
    if (!createdReadHistory) {
      return err(new ServerError(new Error('insert read_histories returned no row')))
    }
    const readHistory: ReadHistory = {
      readHistoryId: fromDbId(createdReadHistory.readHistoryId),
      activeUserId: fromDbId(createdReadHistory.activeUserId),
      articleId: fromDbId(createdReadHistory.articleId),
      readAt: createdReadHistory.readAt,
      createdAt: createdReadHistory.createdAt,
    }
    return ok(readHistory)
  }

  async deleteAllReadHistory(
    activeUserId: bigint,
    articleId: bigint,
  ): Promise<Result<void, Error>> {
    const dbActiveUserId = toDbId(activeUserId)
    const dbArticleId = toDbId(articleId)
    const result = await wrapAsyncCall(() =>
      this.db
        .delete(readHistories)
        .where(
          and(
            eq(readHistories.activeUserId, dbActiveUserId),
            eq(readHistories.articleId, dbArticleId),
          ),
        ),
    )
    if (result.isErr()) {
      return err(new ServerError(unwrapDbError(result.error)))
    }

    return ok(undefined)
  }

  async createSkippedArticle(
    activeUserId: bigint,
    articleId: bigint,
  ): Promise<Result<SkippedArticle, Error>> {
    const dbActiveUserId = toDbId(activeUserId)
    const dbArticleId = toDbId(articleId)

    const result = await wrapAsyncCall(() =>
      this.db
        .insert(skippedArticles)
        .values({
          activeUserId: dbActiveUserId,
          articleId: dbArticleId,
        })
        // INFO: 競合時も returning が行を返すよう、既存行に対しダミー更新(値不変)を行う
        .onConflictDoUpdate({
          target: [skippedArticles.articleId, skippedArticles.activeUserId],
          set: { activeUserId: dbActiveUserId },
        })
        .returning(),
    )
    if (result.isErr()) {
      return err(new ServerError(unwrapDbError(result.error)))
    }

    const skippedArticle = result.value[0]
    if (!skippedArticle) {
      return err(new ServerError(new Error('insert skipped_articles returned no row')))
    }
    return ok({
      skippedArticleId: fromDbId(skippedArticle.skippedArticleId),
      activeUserId: fromDbId(skippedArticle.activeUserId),
      articleId: fromDbId(skippedArticle.articleId),
      createdAt: skippedArticle.createdAt,
    })
  }
}
