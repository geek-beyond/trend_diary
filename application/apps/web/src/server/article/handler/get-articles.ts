import getRdbClient from '@trend-diary/datastore/rdb'
import type { QueryParams } from '@trend-diary/domain/article'
import { createArticleUseCase } from '@trend-diary/domain/article'
import {
  baseArticleSearchSchema,
  DATE_RANGE_ERROR_MESSAGE,
  dateRangeRefine,
} from '@trend-diary/domain/article/schema/query-schema'
import type { OffsetPaginationResult } from '@trend-diary/std/pagination'
import { offsetPaginationSchema } from '@trend-diary/std/pagination'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { type ArticleResponse, toArticleResponse } from '../article-response'

const readStatusEnum = z.enum(['0', '1'])

const apiArticleQuerySchema = baseArticleSearchSchema
  .extend({
    read_status: readStatusEnum.optional(),
  })
  .merge(offsetPaginationSchema)
  .refine(dateRangeRefine, {
    message: DATE_RANGE_ERROR_MESSAGE,
  })

export type ApiQueryParams = z.infer<typeof apiArticleQuerySchema>

export const apiArticleQueryValidator = zodValidator('query', apiArticleQuerySchema)

export type ArticleWithReadStatusResponse = ArticleResponse & {
  isRead: boolean
}

export type ArticleListResponse = OffsetPaginationResult<ArticleResponse>

export default async function getArticles(
  c: ZodValidatedContext<[typeof apiArticleQueryValidator]>,
) {
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
    throw result.error
  }

  const paginationResult = result.value
  logger.info('articles retrieved successfully', { count: paginationResult.data.length })
  const response: ArticleListResponse = {
    data: paginationResult.data.map(toArticleResponse),
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
