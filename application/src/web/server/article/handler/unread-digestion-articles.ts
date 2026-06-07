import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { z } from 'zod'
import { createArticleUseCase } from '@/domain/article'
import { ARTICLE_MEDIA } from '@/domain/article/media'
import type { ArticleOutput } from '@/domain/article/schema/article-schema'
import CONTEXT_KEY from '@/web/middleware/context'
import type { ZodValidatedQueryContext } from '@/web/middleware/zod-validator'

type ArticleResponse = Omit<ArticleOutput, 'articleId'> & {
  articleId: string
}

type UnreadDigestionArticlesResponse = {
  data: ArticleResponse[]
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
  const sessionUser = c.get(CONTEXT_KEY.SESSION_USER)!
  const query = c.req.valid('query')

  const rdb = getRdbClient(c.env.DB)
  const useCase = createArticleUseCase(rdb)
  const result = await useCase.getUnreadDigestionArticles(sessionUser.activeUserId, query.media)
  if (result.isErr()) {
    throw handleError(result.error, logger)
  }

  const response: UnreadDigestionArticlesResponse = { data: result.value.map(toArticleResponse) }

  logger.info('unread digestion articles retrieved successfully', { count: response.data.length })
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
