import { Hono } from 'hono'
import type { Env } from '@/env'
import articleCache from '@/middleware/article-cache'
import { authenticator, optionalAuthenticator } from '@/middleware/authenticator'
import zodValidator from '@/middleware/zod-validator'
import getArticles, { apiArticleQuerySchema } from './handler/get-articles'
import getDiary, { diaryQuerySchema } from './handler/get-diary'
import readArticle, {
  articleIdParamSchema,
  createReadHistoryApiSchema,
} from './handler/read-article'
import skipArticle from './handler/skip-article'
import unreadArticle from './handler/unread-article'
import unreadDigestionArticles, {
  unreadDigestionQuerySchema,
} from './handler/unread-digestion-articles'

const app = new Hono<Env>()
  .get(
    '/',
    articleCache,
    optionalAuthenticator,
    zodValidator('query', apiArticleQuerySchema),
    getArticles,
  )
  .get('/diary', authenticator, zodValidator('query', diaryQuerySchema), getDiary)
  .get(
    '/unread-digestion',
    authenticator,
    zodValidator('query', unreadDigestionQuerySchema),
    unreadDigestionArticles,
  )
  .post(
    '/:article_id/read',
    authenticator,
    zodValidator('param', articleIdParamSchema),
    zodValidator('json', createReadHistoryApiSchema),
    readArticle,
  )
  .post(
    '/:article_id/skip',
    authenticator,
    zodValidator('param', articleIdParamSchema),
    skipArticle,
  )
  .delete(
    '/:article_id/unread',
    authenticator,
    zodValidator('param', articleIdParamSchema),
    unreadArticle,
  )

export default app
