import { createArticleUseCase } from '@trend-diary/domain/article'
import {
  type AuthenticatedRequestContext,
  createAuthenticatedApiHandler,
} from '@/server/handler/factory'
import type { ArticleIdParam } from './read-article'

export default createAuthenticatedApiHandler({
  createUseCase: createArticleUseCase,
  execute: async (useCase, context: AuthenticatedRequestContext<ArticleIdParam>) => {
    return useCase.createSkippedArticle(context.user.activeUserId, context.param.article_id)
  },
  transform: () => ({ message: '記事をスキップしました' }),
  logMessage: 'Article skipped successfully',
  logPayload: (_result, context) => ({
    activeUserId: context.user.activeUserId,
    articleId: context.param.article_id,
  }),
  statusCode: 201,
})
