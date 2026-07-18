import { Hono } from 'hono'
import { createRequestHandler, RouterContextProvider } from 'react-router'
// @ts-ignore ビルド後に生成されるため
import * as build from '../build/server'
import type { Env } from './env'
import { buildLoadContext } from './load-context'
import server from './server'

const requestHandler = createRequestHandler(build, 'production')
// SSR ビルド内で生成された唯一の context トークンを使う（worker バンドルで再評価すると別インスタンスになるため）
const { appLoadContext } = build.entry.module

const app = new Hono<Env>()

// API・共通ミドルウェア（securityHeaders 等）を先に通し、nonce 生成後に React Router へフォールバックする
app.route('/', server)
app.use(async (c) => {
  const context = new RouterContextProvider()
  context.set(appLoadContext, buildLoadContext(c))
  return requestHandler(c.req.raw, context)
})

export default app
