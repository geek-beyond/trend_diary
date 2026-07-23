import { createArticleActionHandler } from '../article-action'

export default createArticleActionHandler({
  execute: (useCase, activeUserId, articleId) =>
    useCase.createSkippedArticle(activeUserId, articleId),
  statusCode: 201,
})
