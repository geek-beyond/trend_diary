import { handleError } from '@trend-diary/common/errors'
import { OffsetPaginationResult, offsetPaginationSchema } from '@trend-diary/common/pagination'
import { z } from 'zod'
import { createArticleUseCase, QueryParams } from '@/domain/article'
import { ARTICLE_MEDIA } from '@/domain/article/media'
import type { ArticleWithOptionalReadStatus } from '@/domain/article/schema/article-schema'
import { ArticleOutput } from '@/domain/article/schema/article-schema'
import getRdbClient from '@/infrastructure/rdb'
import CONTEXT_KEY from '@/web/middleware/context'
import { ZodValidatedQueryContext } from '@/web/middleware/zod-validator'

const mediaEnum = z.enum(ARTICLE_MEDIA)
const readStatusEnum = z.enum(['0', '1'])
const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()

const baseArticleSearchSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  media: mediaEnum.optional(),
  from: dateStringSchema,
  to: dateStringSchema,
})

// 日付の範囲チェック用のrefine関数
const dateRangeRefine = <T extends { from?: string; to?: string }>(data: T) => {
  if (data.from && data.to) {
    return data.from <= data.to
  }
  return true
}

// エラーメッセージ
const DATE_RANGE_ERROR_MESSAGE = 'fromはtoより前の日付を指定してください'

export const apiArticleQuerySchema = baseArticleSearchSchema
  .extend({
    read_status: readStatusEnum.optional(),
  })
  .merge(offsetPaginationSchema)
  .refine(dateRangeRefine, {
    message: DATE_RANGE_ERROR_MESSAGE,
  })

export type ApiQueryParams = z.infer<typeof apiArticleQuerySchema>

export type ArticleResponse = Omit<ArticleOutput, 'articleId'> & {
  articleId: string
  isRead?: boolean
}

export type ArticleWithReadStatusResponse = ArticleResponse & {
  isRead: boolean
}

export type ArticleListResponse = OffsetPaginationResult<ArticleResponse>

export default async function getArticles(c: ZodValidatedQueryContext<ApiQueryParams>) {
  const transformedParams = c.req.valid('query')
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  // SESSION_USER があれば activeUserId を取得
  const sessionUser = c.get(CONTEXT_KEY.SESSION_USER)
  const activeUserId = sessionUser?.activeUserId

  const rdb = getRdbClient(c.env.DB)
  const useCase = createArticleUseCase(rdb)

  const result = await useCase.searchArticles(
    convertApiQueryParams(transformedParams),
    activeUserId,
  )
  if (result.isErr()) {
    throw handleError(result.error, logger)
  }

  const paginationResult = result.value
  logger.info('articles retrieved successfully', { count: paginationResult.data.length })
  const response: ArticleListResponse = {
    data: paginationResult.data.map(convertToResponse),
    page: paginationResult.page,
    limit: paginationResult.limit,
    total: paginationResult.total,
    totalPages: paginationResult.totalPages,
    hasNext: paginationResult.hasNext,
    hasPrev: paginationResult.hasPrev,
  }
  return c.json(response)
}

function convertApiQueryParams(params: ApiQueryParams): QueryParams {
  let readStatus: boolean | undefined
  if (params.read_status === '1') {
    readStatus = true
  } else if (params.read_status === '0') {
    readStatus = false
  } else {
    readStatus = undefined
  }

  return {
    limit: params.limit,
    page: params.page,
    title: params.title,
    author: params.author,
    media: params.media,
    from: params.from,
    to: params.to,
    readStatus,
  }
}

function convertToResponse(article: ArticleWithOptionalReadStatus): ArticleResponse {
  return {
    articleId: article.articleId.toString(),
    media: article.media,
    title: article.title,
    author: article.author,
    description: article.description,
    url: article.url,
    createdAt: article.createdAt,
    isRead: article.isRead,
  }
}
