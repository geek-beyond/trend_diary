import { NotFoundError, ServerError } from '@/common/errors'
import { toJstDateString } from '@/common/locale/date'
import { DEFAULT_LIMIT, DEFAULT_PAGE, OffsetPaginationResult } from '@/common/pagination'
import { AsyncResult, failure, isFailure, success } from '@/common/result'
import extractTrimmed from '@/common/sanitization'
import { isNull } from '@/common/types/utility'
import type { ArticleMedia } from '@/domain/article/media'
import { Command, Query } from '@/domain/article/repository'
import type { Article, ArticleWithOptionalReadStatus } from '@/domain/article/schema/article-schema'
import type { DailyDiary, DailyDiaryRangeItem } from '@/domain/article/schema/diary-schema'
import { QueryParams } from '@/domain/article/schema/query-schema'
import type { ReadHistory } from '@/domain/article/schema/read-history-schema'
import type { SkippedArticle } from '@/domain/article/schema/skipped-article-schema'

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
  ): AsyncResult<OffsetPaginationResult<ArticleWithOptionalReadStatus>, ServerError> {
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
  ): AsyncResult<ReadHistory, Error> {
    return this.withValidatedArticle(articleId, () =>
      this.command.createReadHistory(activeUserId, articleId, readAt),
    )
  }

  async getUnreadDigestionArticles(
    activeUserId: bigint,
    media?: ArticleMedia,
    now: Date = new Date(),
  ): AsyncResult<Article[], Error> {
    const targetDateJstResult = toJstDateString(now)
    if (isFailure(targetDateJstResult)) {
      return failure(new ServerError(targetDateJstResult.error))
    }

    return this.query.getUnreadDigestionArticles(activeUserId, targetDateJstResult.data, media)
  }

  async getDailyDiary(
    activeUserId: bigint,
    targetDateJst: string,
    page: number,
    limit: number,
  ): AsyncResult<DailyDiary, Error> {
    return this.query.getDailyDiary(activeUserId, targetDateJst, page, limit)
  }

  async getDailyDiaryRange(
    activeUserId: bigint,
    fromDateJst: string,
    toDateJst: string,
  ): AsyncResult<DailyDiaryRangeItem[], Error> {
    return this.query.getDailyDiaryRange(activeUserId, fromDateJst, toDateJst)
  }

  async createSkippedArticle(
    activeUserId: bigint,
    articleId: bigint,
  ): AsyncResult<SkippedArticle, Error> {
    return this.withValidatedArticle(articleId, (validatedArticleId) =>
      this.command.createSkippedArticle(activeUserId, validatedArticleId),
    )
  }

  async deleteAllReadHistory(activeUserId: bigint, articleId: bigint): AsyncResult<void, Error> {
    return this.withValidatedArticle(articleId, (validatedArticleId) =>
      this.command.deleteAllReadHistory(activeUserId, validatedArticleId),
    )
  }

  private async withValidatedArticle<T>(
    articleId: bigint,
    action: (validatedArticleId: bigint) => AsyncResult<T, Error>,
  ): AsyncResult<T, Error> {
    const articleValidation = await this.validateArticleExists(articleId)
    if (isFailure(articleValidation)) return articleValidation

    return action(articleValidation.data.articleId)
  }

  private async validateArticleExists(articleId: bigint): AsyncResult<Article, Error> {
    const res = await this.query.findArticleById(articleId)
    if (isFailure(res)) return res

    if (isNull(res.data)) {
      return failure(new NotFoundError(`Article with ID ${articleId} not found`))
    }

    return success(res.data)
  }
}
