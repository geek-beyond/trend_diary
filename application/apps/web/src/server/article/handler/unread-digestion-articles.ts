import getRdbClient from '@trend-diary/datastore/rdb'
import { createArticleUseCase } from '@trend-diary/domain/article'
import { mediaListSchema } from '@trend-diary/domain/article/schema/query-schema'
import { z } from 'zod'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import throwArticleHttpError from '@/server/error/article-error'
import { type ArticleResponse, toArticleResponse } from '../article-response'

interface UnreadDigestionArticlesResponse {
  data: ArticleResponse[]
  total: number
}

const unreadDigestionQuerySchema = z.object({
  media: mediaListSchema,
})

export const unreadDigestionQueryValidator = zodValidator('query', unreadDigestionQuerySchema)

export default async function unreadDigestionArticles(
  c: ZodValidatedContext<[typeof unreadDigestionQueryValidator]>,
): Promise<Response> {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const sessionUser = mustGet(c, CONTEXT_KEY.SESSION_USER)
  const query = c.req.valid('query')

  const rdb = getRdbClient(c.env.DB)
  const useCase = createArticleUseCase(rdb)
  const result = await useCase.getUnreadDigestionArticles(sessionUser.activeUserId, query.media)
  if (result.isErr()) {
    throwArticleHttpError(result.error)
  }

  const response: UnreadDigestionArticlesResponse = {
    data: result.value.articles.map(toArticleResponse),
    total: result.value.total,
  }

  logger.info('unread digestion articles retrieved successfully', {
    count: response.data.length,
    total: response.total,
  })
  return c.json(response, 200)
}
