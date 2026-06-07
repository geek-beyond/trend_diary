import { createArticleUseCase } from '@trend-diary/domain/article'
import {
  type AuthenticatedRequestContext,
  createAuthenticatedApiHandler,
} from '@/server/handler/factory'
import { ArticleIdParam } from './read-article'

export default createAuthenticatedApiHandler({
  createUseCase: createArticleUseCase,
  execute: async (useCase, context: AuthenticatedRequestContext<ArticleIdParam>) => {
    return useCase.deleteAllReadHistory(context.user.activeUserId, context.param.article_id)
  },
  transform: () => ({ message: '記事を未読にしました' }),
  logMessage: 'Read history deleted successfully',
  logPayload: (_result, context) => ({
    activeUserId: context.user.activeUserId,
    articleId: context.param.article_id,
  }),
  statusCode: 200,
})
