import { and, eq } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import { ServerError, unwrapDbError } from '@/common/errors'
import { wrapAsyncCall } from '@/common/result'
import { Command } from '@/domain/article/repository'
import type { ReadHistory } from '@/domain/article/schema/read-history-schema'
import type { SkippedArticle } from '@/domain/article/schema/skipped-article-schema'
import { readHistories, skippedArticles } from '@/infrastructure/drizzle-orm/schema'
import { RdbClient } from '@/infrastructure/rdb'
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

    const result = await wrapAsyncCall(async () => {
      const inserted = await this.db
        .insert(skippedArticles)
        .values({
          activeUserId: dbActiveUserId,
          articleId: dbArticleId,
        })
        .onConflictDoNothing({
          target: [skippedArticles.articleId, skippedArticles.activeUserId],
        })
        .returning()

      // INFO: 競合時は returning が空になるため、既存仕様(既存行を返す)に合わせて既存行を取得する
      if (inserted.length > 0) {
        return inserted[0]
      }

      const existing = await this.db
        .select()
        .from(skippedArticles)
        .where(
          and(
            eq(skippedArticles.articleId, dbArticleId),
            eq(skippedArticles.activeUserId, dbActiveUserId),
          ),
        )
      return existing[0]
    })
    if (result.isErr()) {
      return err(new ServerError(unwrapDbError(result.error)))
    }

    const skippedArticle = result.value
    if (!skippedArticle) {
      return err(new ServerError(new Error('skipped_articles row not found after conflict')))
    }
    return ok({
      skippedArticleId: fromDbId(skippedArticle.skippedArticleId),
      activeUserId: fromDbId(skippedArticle.activeUserId),
      articleId: fromDbId(skippedArticle.articleId),
      createdAt: skippedArticle.createdAt,
    })
  }
}
