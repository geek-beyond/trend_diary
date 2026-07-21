import type { RdbClient } from '@trend-diary/datastore/rdb'
import { wrapDbCall } from '@trend-diary/datastore/rdb'
import { fromDbId, toDbId } from '@trend-diary/datastore/rdb/id'
import { articles, normalizeDateTime, readHistories } from '@trend-diary/datastore/schema'
import { and, eq, exists, sql } from 'drizzle-orm'
import { err, ok, type Result } from 'neverthrow'
import { ArticleNotFoundError } from '../error'
import type { Command } from '../port'
import type { ReadHistory } from '../schema/read-history-schema'
import type { SkippedArticle } from '../schema/skipped-article-schema'

// INFO: 生SQL(db.all)はcustomTypeを通らずドライバの素値(文字列/数値)を返す。Dateにはならない
interface RawReadHistoryRow {
  readHistoryId: number | bigint
  activeUserId: number | bigint
  articleId: number | bigint
  readAt: string | number | bigint
  createdAt: string | number | bigint
}

interface RawSkippedArticleRow {
  skippedArticleId: number | bigint
  activeUserId: number | bigint
  articleId: number | bigint
  createdAt: string | number | bigint
}

export default class CommandImpl implements Command {
  constructor(private readonly db: RdbClient) {}

  async createReadHistory(
    activeUserId: bigint,
    articleId: bigint,
    readAt: Date,
  ): Promise<Result<ReadHistory, Error>> {
    const dbActiveUserId = toDbId(activeUserId)
    const dbArticleId = toDbId(articleId)

    // 記事存在チェックのSELECTと挿入を1文に集約する。記事が無ければ挿入されず0行になり ArticleNotFoundError を返す
    const result = await wrapDbCall(() =>
      this.db.all<RawReadHistoryRow>(sql`
        INSERT INTO read_histories (active_user_id, article_id, read_at)
        SELECT ${dbActiveUserId}, ${dbArticleId}, ${readAt.toISOString()}
        WHERE EXISTS (SELECT 1 FROM articles WHERE article_id = ${dbArticleId})
        RETURNING
          read_history_id as readHistoryId,
          active_user_id as activeUserId,
          article_id as articleId,
          read_at as readAt,
          created_at as createdAt
      `),
    )
    if (result.isErr()) {
      return err(result.error)
    }

    const createdReadHistory = result.value[0]
    if (!createdReadHistory) {
      return err(new ArticleNotFoundError(`Article with ID ${articleId} not found`))
    }
    return ok({
      readHistoryId: fromDbId(createdReadHistory.readHistoryId),
      activeUserId: fromDbId(createdReadHistory.activeUserId),
      articleId: fromDbId(createdReadHistory.articleId),
      readAt: normalizeDateTime(createdReadHistory.readAt),
      createdAt: normalizeDateTime(createdReadHistory.createdAt),
    })
  }

  async deleteAllReadHistory(
    activeUserId: bigint,
    articleId: bigint,
  ): Promise<Result<void, Error>> {
    const dbActiveUserId = toDbId(activeUserId)
    const dbArticleId = toDbId(articleId)

    // 記事存在チェックと削除を db.batch で1往復にまとめる。
    // D1のdb.batchは生SQL(SQLiteRaw)を扱えないためクエリビルダ文を渡す。
    // 記事が存在する時だけ削除する(EXISTSガード)ことで、記事削除後も履歴を保持する設計を保つ
    const result = await wrapDbCall(() =>
      this.db.batch([
        this.db
          .select({ articleId: articles.articleId })
          .from(articles)
          .where(eq(articles.articleId, dbArticleId))
          .limit(1),
        this.db.delete(readHistories).where(
          and(
            eq(readHistories.activeUserId, dbActiveUserId),
            eq(readHistories.articleId, dbArticleId),
            exists(
              this.db
                .select({ one: sql`1` })
                .from(articles)
                .where(eq(articles.articleId, dbArticleId)),
            ),
          ),
        ),
      ]),
    )
    if (result.isErr()) {
      return err(result.error)
    }

    const [articleRows] = result.value
    if (articleRows.length === 0) {
      return err(new ArticleNotFoundError(`Article with ID ${articleId} not found`))
    }

    return ok(undefined)
  }

  async createSkippedArticle(
    activeUserId: bigint,
    articleId: bigint,
  ): Promise<Result<SkippedArticle, Error>> {
    const dbActiveUserId = toDbId(activeUserId)
    const dbArticleId = toDbId(articleId)

    // 記事存在チェックのSELECTと挿入を1文に集約する。記事が無ければ挿入されず0行になり ArticleNotFoundError を返す。
    // 競合時も returning が行を返すよう、既存行に対しダミー更新(値不変)を行う
    const result = await wrapDbCall(() =>
      this.db.all<RawSkippedArticleRow>(sql`
        INSERT INTO skipped_articles (active_user_id, article_id)
        SELECT ${dbActiveUserId}, ${dbArticleId}
        WHERE EXISTS (SELECT 1 FROM articles WHERE article_id = ${dbArticleId})
        ON CONFLICT (article_id, active_user_id) DO UPDATE SET active_user_id = ${dbActiveUserId}
        RETURNING
          skipped_article_id as skippedArticleId,
          active_user_id as activeUserId,
          article_id as articleId,
          created_at as createdAt
      `),
    )
    if (result.isErr()) {
      return err(result.error)
    }

    const skippedArticle = result.value[0]
    if (!skippedArticle) {
      return err(new ArticleNotFoundError(`Article with ID ${articleId} not found`))
    }
    return ok({
      skippedArticleId: fromDbId(skippedArticle.skippedArticleId),
      activeUserId: fromDbId(skippedArticle.activeUserId),
      articleId: fromDbId(skippedArticle.articleId),
      createdAt: normalizeDateTime(skippedArticle.createdAt),
    })
  }
}
