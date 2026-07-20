import { createArticleActionHandler } from '../article-action'

export default createArticleActionHandler((useCase, activeUserId, articleId) =>
  useCase.createSkippedArticle(activeUserId, articleId),
)
