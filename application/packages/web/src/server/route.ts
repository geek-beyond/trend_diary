import { Hono } from 'hono'
import articleApp from '@/server/article/route'
import authApp from '@/server/auth/route'
import healthApp from '@/server/health/route'

const app = new Hono()
  .route('/articles', articleApp)
  .route('/auth', authApp)
  .route('/health', healthApp)

export default app
