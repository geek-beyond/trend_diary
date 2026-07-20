import { Hono } from 'hono'
import articleApp from '@/server/article/route'
import authApp from '@/server/auth/route'
import oauthApp from '@/server/oauth/route'
import passkeyApp from '@/server/passkey/route'

const app = new Hono()
  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/articles', articleApp)
  .route('/auth', authApp)
  .route('/oauth', oauthApp)
  .route('/passkey', passkeyApp)

export default app
