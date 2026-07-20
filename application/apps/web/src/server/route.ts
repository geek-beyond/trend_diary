import { Hono } from 'hono'
import articleApp from '@/server/article/route'
import authApp from '@/server/auth/route'
import oauthApp from '@/server/oauth/route'
import registrationsApp from '@/server/registrations/route'
import sessionsApp from '@/server/sessions/route'

const app = new Hono()
  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/articles', articleApp)
  .route('/auth', authApp)
  .route('/oauth', oauthApp)
  .route('/registrations', registrationsApp)
  .route('/sessions', sessionsApp)

export default app
