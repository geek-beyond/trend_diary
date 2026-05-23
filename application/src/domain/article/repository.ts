import { ServerError } from '@/common/errors'
import { OffsetPaginationResult } from '@/common/pagination'
import { AsyncResult } from '@/common/result'
import { Nullable } from '@/common/types/utility'
import type { ArticleMedia } from '@/domain/article/media'
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
  ): AsyncResult<OffsetPaginationResult<ArticleWithOptionalReadStatus>, ServerError>

  getUnreadDigestionArticles(
    activeUserId: bigint,
    targetDateJst: string,
    media?: ArticleMedia,
  ): AsyncResult<Article[], ServerError>

  getDailyDiary(
    activeUserId: bigint,
    targetDateJst: string,
    page: number,
    limit: number,
  ): AsyncResult<DailyDiary, ServerError>

  getDailyDiaryRange(
    activeUserId: bigint,
    fromDateJst: string,
    toDateJst: string,
  ): AsyncResult<DailyDiaryRangeItem[], ServerError>

  findArticleById(articleId: bigint): AsyncResult<Nullable<Article>, ServerError>
}

export interface Command {
  createReadHistory(
    activeUserId: bigint,
    articleId: bigint,
    readAt: Date,
  ): AsyncResult<ReadHistory, Error>

  createSkippedArticle(activeUserId: bigint, articleId: bigint): AsyncResult<SkippedArticle, Error>

  deleteAllReadHistory(activeUserId: bigint, articleId: bigint): AsyncResult<void, Error>
}
