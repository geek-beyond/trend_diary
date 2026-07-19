import { type NotFoundError, ServerError } from '@trend-diary/common/errors'
import { toJstDateString } from '@trend-diary/common/locale/date'
import type { OffsetPaginationResult } from '@trend-diary/common/pagination'
import { DEFAULT_LIMIT, DEFAULT_PAGE } from '@trend-diary/common/pagination'
import extractTrimmed from '@trend-diary/common/sanitization'
import { err, type Result } from 'neverthrow'
import type { ArticleMedia } from './media'
import type { Command, Query } from './port'
import type { ArticleWithOptionalReadStatus, UnreadDigestionResult } from './schema/article-schema'
import type { DailyDiary, DailyDiaryRangeItem } from './schema/diary-schema'
import type { QueryParams } from './schema/query-schema'
import type { ReadHistory } from './schema/read-history-schema'
import type { SkippedArticle } from './schema/skipped-article-schema'

export class UseCase {
  constructor(
    private readonly query: Query,
    private readonly command: Command,
  ) {}

  /**
   * 記事を検索する
   * @param params 検索パラメータ
   * @param activeUserId オプション。指定された場合、各記事にisReadフィールドを付与
   */
  async searchArticles(
    params: QueryParams,
    activeUserId?: bigint,
  ): Promise<Result<OffsetPaginationResult<ArticleWithOptionalReadStatus>, ServerError>> {
    const optimizedParams: QueryParams = {
      title: extractTrimmed(params.title),
      author: extractTrimmed(params.author),
      limit: params.limit ?? DEFAULT_LIMIT,
      page: params.page ?? DEFAULT_PAGE,
      from: params.from,
      to: params.to,
      media: params.media,
      readStatus: params.readStatus,
    }

    return this.query.searchArticles(optimizedParams, activeUserId)
  }

  async createReadHistory(
    activeUserId: bigint,
    articleId: bigint,
    readAt: Date,
  ): Promise<Result<ReadHistory, ServerError | NotFoundError>> {
    // 記事存在チェックは command 側のSQLに集約済みのため、ここでは委譲のみ行う
    return this.command.createReadHistory(activeUserId, articleId, readAt)
  }

  async getUnreadDigestionArticles(
    activeUserId: bigint,
    media?: ArticleMedia[],
    now: Date = new Date(),
  ): Promise<Result<UnreadDigestionResult, Error>> {
    const targetDateJstResult = toJstDateString(now)
    if (targetDateJstResult.isErr()) {
      return err(new ServerError(targetDateJstResult.error))
    }

    return this.query.getUnreadDigestionArticles(activeUserId, targetDateJstResult.value, media)
  }

  async getDailyDiary(
    activeUserId: bigint,
    targetDateJst: string,
    page: number,
    limit: number,
  ): Promise<Result<DailyDiary, Error>> {
    return this.query.getDailyDiary(activeUserId, targetDateJst, page, limit)
  }

  async getDailyDiaryRange(
    activeUserId: bigint,
    fromDateJst: string,
    toDateJst: string,
  ): Promise<Result<DailyDiaryRangeItem[], Error>> {
    return this.query.getDailyDiaryRange(activeUserId, fromDateJst, toDateJst)
  }

  async createSkippedArticle(
    activeUserId: bigint,
    articleId: bigint,
  ): Promise<Result<SkippedArticle, ServerError | NotFoundError>> {
    // 記事存在チェックは command 側のSQLに集約済みのため、ここでは委譲のみ行う
    return this.command.createSkippedArticle(activeUserId, articleId)
  }

  async deleteAllReadHistory(
    activeUserId: bigint,
    articleId: bigint,
  ): Promise<Result<void, ServerError | NotFoundError>> {
    // 記事存在チェックは command 側のSQLに集約済みのため、ここでは委譲のみ行う
    return this.command.deleteAllReadHistory(activeUserId, articleId)
  }
}
