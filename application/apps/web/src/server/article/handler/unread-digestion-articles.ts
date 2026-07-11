import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createArticleUseCase } from '@trend-diary/domain/article'
import { mediaListSchema } from '@trend-diary/domain/article/schema/query-schema'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedQueryContext } from '@/middleware/zod-validator'
import { type ArticleResponse, toArticleResponse } from '../article-response'

interface UnreadDigestionArticlesResponse {
  data: ArticleResponse[]
  total: number
}

export const unreadDigestionQuerySchema = z.object({
  media: mediaListSchema,
})

type UnreadDigestionQuery = z.infer<typeof unreadDigestionQuerySchema>

export default async function unreadDigestionArticles(
  c: ZodValidatedQueryContext<UnreadDigestionQuery>,
): Promise<Response> {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const sessionUser = c.get(CONTEXT_KEY.SESSION_USER)!
  const query = c.req.valid('query')

  const rdb = getRdbClient(c.env.DB)
  const useCase = createArticleUseCase(rdb)
  const result = await useCase.getUnreadDigestionArticles(sessionUser.activeUserId, query.media)
  if (result.isErr()) {
    throw handleError(result.error, logger)
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
