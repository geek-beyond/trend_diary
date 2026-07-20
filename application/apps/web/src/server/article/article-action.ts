import getRdbClient from '@trend-diary/datastore/rdb'
import { createArticleUseCase } from '@trend-diary/domain/article'
import type { Result } from 'neverthrow'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { handleError } from '@/server/error/handle-error'
import type { articleIdParamValidator } from './handler/read-article'

type ArticleUseCase = ReturnType<typeof createArticleUseCase>

export type ArticleActionContext = ZodValidatedContext<[typeof articleIdParamValidator]>

export function createArticleActionHandler<TOutput>(
  execute: (
    useCase: ArticleUseCase,
    activeUserId: bigint,
    articleId: bigint,
  ) => Promise<Result<TOutput, Error>>,
) {
  return async (c: ArticleActionContext) => {
    const logger = mustGet(c, CONTEXT_KEY.APP_LOG)
    const user = mustGet(c, CONTEXT_KEY.SESSION_USER)
    const { article_id } = c.req.valid('param')

    const useCase = createArticleUseCase(getRdbClient(c.env.DB))
    const result = await execute(useCase, user.activeUserId, article_id)
    if (result.isErr()) {
      handleError(result.error, logger)
    }

    logger.info({
      msg: 'article action completed',
      method: c.req.method,
      route: c.req.routePath,
      activeUserId: user.activeUserId,
      articleId: article_id,
    })
    return c.body(null, 204)
  }
}
