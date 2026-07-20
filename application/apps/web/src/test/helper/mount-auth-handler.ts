import Logger from '@trend-diary/logger'
import { type Context, Hono } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'

export default function mountAuthHandler(handler: (c: Context<Env>) => Promise<Response>) {
  const app = new Hono<Env>()
  const logger = new Logger('silent')
  app.use('*', async (c, next) => {
    c.set(CONTEXT_KEY.APP_LOG, logger)
    await next()
  })
  app.post('/auth', handler)
  return () => app.request('/auth', { method: 'POST' }, { DB: {} })
}
