import { Hono } from 'hono'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'
import { AppLoadContext, createRequestHandler } from 'react-router'
import { Env } from './env'
import errorHandler from './middleware/error-handler'
import requestLogger from './middleware/request-logger'
import apiApp from './server/route'

const app = new Hono<Env>()

app.use(secureHeaders())
app.use(requestLogger)
app.onError(errorHandler)

app.use('/api', timeout(5000))
app.route('/api', apiApp)

// hotReload用
if (process.env.NODE_ENV === 'development')
  app.all('*', async (c) => {
    // ビルド結果をhonoにうまく繋ぎこむために使う virtual import
    // @ts-ignore
    const build = await import('virtual:react-router/server-build')
    const handler = createRequestHandler(build, 'development')
    const remixContext = {
      cloudflare: {
        env: c.env,
      },
    } as unknown as AppLoadContext
    return handler(c.req.raw, remixContext)
  })

export default app
