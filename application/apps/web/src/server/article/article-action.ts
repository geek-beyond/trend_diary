import getRdbClient from '@trend-diary/datastore/rdb'
import { createArticleUseCase } from '@trend-diary/domain/article'
import type { Result } from 'neverthrow'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import type { articleIdParamValidator } from './handler/read-article'

type ArticleUseCase = ReturnType<typeof createArticleUseCase>

export type ArticleActionContext = ZodValidatedContext<[typeof articleIdParamValidator]>

export function createArticleActionHandler<TOutput, TStatus extends 200 | 201>(config: {
  execute: (
    useCase: ArticleUseCase,
    activeUserId: bigint,
    articleId: bigint,
  ) => Promise<Result<TOutput, Error>>
  statusCode: TStatus
}) {
  return async (c: ArticleActionContext) => {
    const logger = mustGet(c, CONTEXT_KEY.APP_LOG)
    const user = mustGet(c, CONTEXT_KEY.SESSION_USER)
    const { article_id } = c.req.valid('param')

    const useCase = createArticleUseCase(getRdbClient(c.env.DB))
    const result = await config.execute(useCase, user.activeUserId, article_id)
    if (result.isErr()) {
      throw result.error
    }

    logger.info({
      msg: 'article action completed',
      method: c.req.method,
      route: c.req.routePath,
      activeUserId: user.activeUserId,
      articleId: article_id,
    })
    // クライアントの apiCall は 204 以外で response.json() を呼ぶ契約のため、空ボディではなく JSON の null を返す
    return c.json(null, config.statusCode)
  }
}
