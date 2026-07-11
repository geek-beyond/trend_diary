import { Hono } from 'hono'
import articleApp from '@/server/article/route'
import authApp from '@/server/auth/route'
import oauthApp from '@/server/oauth/route'

const app = new Hono()
  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/articles', articleApp)
  .route('/auth', authApp)
  .route('/oauth', oauthApp)

export default app
