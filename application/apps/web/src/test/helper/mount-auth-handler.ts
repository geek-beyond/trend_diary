import Logger from '@trend-diary/logger'
import { type Context, Hono } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'

// 認証系ファクトリーの単体テスト用。実 Hono へルーティングし app.request で本番同等の経路を通す
// (手動 Context モックと型アサーションを避けるため)。ロガーは実 Logger(silent)を APP_LOG に載せる。
export default function mountAuthHandler(handler: (c: Context<Env>) => Promise<Response>) {
  const app = new Hono<Env>()
  const logger = new Logger('silent')
  app.use('*', async (c, next) => {
    c.set(CONTEXT_KEY.APP_LOG, logger)
    await next()
  })
  app.post('/auth', handler)
  // env.DB は getRdbClient のモックが受けるため空で良い
  return () => app.request('/auth', { method: 'POST' }, { DB: {} })
}
