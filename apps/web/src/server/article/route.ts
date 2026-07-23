import { Hono } from 'hono'
import type { Env } from '@/env'
import articleCache from '@/middleware/article-cache'
import { authenticator, optionalAuthenticator } from '@/middleware/authenticator'
import getArticles, { apiArticleQueryValidator } from './handler/get-articles'
import getDiary, { diaryQueryValidator } from './handler/get-diary'
import readArticle, {
  articleIdParamValidator,
  createReadHistoryJsonValidator,
} from './handler/read-article'
import skipArticle from './handler/skip-article'
import unreadArticle from './handler/unread-article'
import unreadDigestionArticles, {
  unreadDigestionQueryValidator,
} from './handler/unread-digestion-articles'

const app = new Hono<Env>()
  .get('/', articleCache, optionalAuthenticator, apiArticleQueryValidator, getArticles)
  .get('/diary', authenticator, diaryQueryValidator, getDiary)
  .get('/unread-digestion', authenticator, unreadDigestionQueryValidator, unreadDigestionArticles)
  .post(
    '/:article_id/read',
    authenticator,
    articleIdParamValidator,
    createReadHistoryJsonValidator,
    readArticle,
  )
  .post('/:article_id/skip', authenticator, articleIdParamValidator, skipArticle)
  .delete('/:article_id/unread', authenticator, articleIdParamValidator, unreadArticle)

export default app
