import type { OffsetPaginationResult } from '@trend-diary/std/pagination'
import type { Nullable } from '@trend-diary/std/types/utility'
import { type Result } from 'neverthrow'
import type { ArticleError } from './error'
import type { ArticleMedia } from './media'
import type {
  Article,
  ArticleWithOptionalReadStatus,
  UnreadDigestionResult,
} from './schema/article-schema'
import type { DailyDiary, DailyDiaryRangeItem } from './schema/diary-schema'
import type { QueryParams } from './schema/query-schema'
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
  ): Promise<Result<OffsetPaginationResult<ArticleWithOptionalReadStatus>, ArticleError>>

  getUnreadDigestionArticles(
    activeUserId: bigint,
    targetDateJst: string,
    media?: ArticleMedia[],
  ): Promise<Result<UnreadDigestionResult, ArticleError>>

  getDailyDiary(
    activeUserId: bigint,
    targetDateJst: string,
    page: number,
    limit: number,
  ): Promise<Result<DailyDiary, ArticleError>>

  getDailyDiaryRange(
    activeUserId: bigint,
    fromDateJst: string,
    toDateJst: string,
  ): Promise<Result<DailyDiaryRangeItem[], ArticleError>>

  findArticleById(articleId: bigint): Promise<Result<Nullable<Article>, ArticleError>>
}

export interface Command {
  /**
   * 既読履歴を作成する。記事が存在しない場合は ArticleNotFoundError を返す
   */
  createReadHistory(
    activeUserId: bigint,
    articleId: bigint,
    readAt: Date,
  ): Promise<Result<ReadHistory, ArticleError>>

  /**
   * 記事をスキップ登録する。記事が存在しない場合は ArticleNotFoundError を返す
   */
  createSkippedArticle(
    activeUserId: bigint,
    articleId: bigint,
  ): Promise<Result<SkippedArticle, ArticleError>>

  /**
   * 記事の既読履歴を全削除する。記事が存在しない場合は ArticleNotFoundError を返す
   */
  deleteAllReadHistory(activeUserId: bigint, articleId: bigint): Promise<Result<void, ArticleError>>
}
