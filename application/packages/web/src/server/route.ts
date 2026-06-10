import { Hono } from 'hono'
import articleApp from '@/server/article/route'
import authApp from '@/server/auth/route'

const app = new Hono()
  .get('/health', (c) => c.json({ status: 'ok' }))
  .route('/articles', articleApp)
  .route('/auth', authApp)

export default app
