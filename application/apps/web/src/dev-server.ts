import { Hono } from 'hono'
import { createRequestHandler, RouterContextProvider } from 'react-router'
// @ts-ignore Vite が dev 時に解決する仮想モジュール
import * as build from 'virtual:react-router/server-build'
import type { Env } from './env'
import { appLoadContext, buildLoadContext } from './load-context'
import server from './server'

// dev では @hono/vite-dev-server がこの Hono アプリを実行し、仮想モジュール経由で SSR を委譲する
const app = new Hono<Env>()

app.route('/', server)
app.use(async (c) => {
  const requestHandler = createRequestHandler(build, 'development')
  const context = new RouterContextProvider()
  context.set(appLoadContext, buildLoadContext(c))
  return requestHandler(c.req.raw, context)
})

export default app
