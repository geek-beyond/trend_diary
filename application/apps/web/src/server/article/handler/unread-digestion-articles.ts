import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createArticleUseCase } from '@trend-diary/domain/article'
import { ARTICLE_MEDIA } from '@trend-diary/domain/article/media'
import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedQueryContext } from '@/middleware/zod-validator'

type ArticleResponse = Omit<ArticleOutput, 'articleId'> & {
  articleId: string
}

interface UnreadDigestionArticlesResponse {
  data: ArticleResponse[]
  total: number
}

const mediaEnum = z.enum(ARTICLE_MEDIA)

export const unreadDigestionQuerySchema = z.object({
  media: mediaEnum.optional(),
})

type UnreadDigestionQuery = z.infer<typeof unreadDigestionQuerySchema>

export default async function unreadDigestionArticles(
  c: ZodValidatedQueryContext<UnreadDigestionQuery>,
): Promise<Response> {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const sessionUser = c.get(CONTEXT_KEY.SESSION_USER)
  if (!sessionUser) {
    throw new HTTPException(401, { message: 'Unauthorized' })
  }
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

function toArticleResponse(article: ArticleOutput): ArticleResponse {
  return {
    articleId: article.articleId.toString(),
    media: article.media,
    title: article.title,
    author: article.author,
    description: article.description,
    url: article.url,
    createdAt: article.createdAt,
  }
}
