import { createArticleActionHandler } from '../article-action'

export default createArticleActionHandler({
  execute: (useCase, activeUserId, articleId) =>
    useCase.deleteAllReadHistory(activeUserId, articleId),
  statusCode: 200,
})
