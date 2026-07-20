import { createArticleActionHandler } from '../article-action'

export default createArticleActionHandler((useCase, activeUserId, articleId) =>
  useCase.deleteAllReadHistory(activeUserId, articleId),
)
