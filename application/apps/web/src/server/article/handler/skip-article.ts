import { createArticleActionHandler } from '../article-action'

export default createArticleActionHandler({
  execute: (useCase, activeUserId, articleId) =>
    useCase.createSkippedArticle(activeUserId, articleId),
  message: '記事をスキップしました',
  logMessage: 'Article skipped successfully',
  statusCode: 201,
})
