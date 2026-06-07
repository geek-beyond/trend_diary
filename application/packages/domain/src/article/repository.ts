import { ServerError } from '@trend-diary/common/errors'
import { OffsetPaginationResult } from '@trend-diary/common/pagination'
import { Nullable } from '@trend-diary/common/types/utility'
import { type Result } from 'neverthrow'
import type { ArticleMedia } from './media'
import type { Article, ArticleWithOptionalReadStatus } from './schema/article-schema'
import type { DailyDiary, DailyDiaryRangeItem } from './schema/diary-schema'
import { QueryParams } from './schema/query-schema'
import type { ReadHistory } from './schema/read-history-schema'
import type { SkippedArticle } from './schema/skipped-article-schema'

export interface Query {
  /**
   * 記事を検索する
   * @param params 検索パラメータ
   * @param activeUserId オプション。指定された場合、各記事にisReadフィールドを付与
   */
  searchArticles(
    params: QueryParams,
    activeUserId?: bigint,
  ): Promise<Result<OffsetPaginationResult<ArticleWithOptionalReadStatus>, ServerError>>

  getUnreadDigestionArticles(
    activeUserId: bigint,
    targetDateJst: string,
    media?: ArticleMedia,
  ): Promise<Result<Article[], ServerError>>

  getDailyDiary(
    activeUserId: bigint,
    targetDateJst: string,
    page: number,
    limit: number,
  ): Promise<Result<DailyDiary, ServerError>>

  getDailyDiaryRange(
    activeUserId: bigint,
    fromDateJst: string,
    toDateJst: string,
  ): Promise<Result<DailyDiaryRangeItem[], ServerError>>

  findArticleById(articleId: bigint): Promise<Result<Nullable<Article>, ServerError>>
}

export interface Command {
  createReadHistory(
    activeUserId: bigint,
    articleId: bigint,
    readAt: Date,
  ): Promise<Result<ReadHistory, Error>>

  createSkippedArticle(
    activeUserId: bigint,
    articleId: bigint,
  ): Promise<Result<SkippedArticle, Error>>

  deleteAllReadHistory(activeUserId: bigint, articleId: bigint): Promise<Result<void, Error>>
}
