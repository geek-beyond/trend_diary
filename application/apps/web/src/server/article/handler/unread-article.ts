import { createArticleActionHandler } from '../article-action'

export default createArticleActionHandler({
  execute: (useCase, activeUserId, articleId) =>
    useCase.deleteAllReadHistory(activeUserId, articleId),
  message: '記事を未読にしました',
  logMessage: 'Read history deleted successfully',
  statusCode: 200,
})
