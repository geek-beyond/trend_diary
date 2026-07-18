import { Hono } from 'hono'
import {
  createRequestHandler,
  type RouterContext,
  RouterContextProvider,
  type ServerBuild,
} from 'react-router'
import type { Env } from './env'
import { type AppLoadContext, buildLoadContext } from './load-context'
import server from './server'

// 本番（worker.ts, wrangler ビルド）向け。React Router を production モードで動かす。
export function createProductionApp(build: ServerBuild): Hono<Env> {
  return createApp(build, 'production')
}

// dev サーバ（dev-server.ts, Vite ビルド）向け。エラーオーバーレイ等の dev フックを有効化する。
// worker/dev は別ツールチェーンでビルドされ実行時に環境を自動判別できないため、専用関数で明示する。
export function createDevelopmentApp(build: ServerBuild): Hono<Env> {
  return createApp(build, 'development')
}

/**
 * Hono の API アプリに React Router の SSR をフォールバックで結線した Hono アプリを組み立てる。
 *
 * context トークンは必ず build.entry.module から取得する。worker と SSR ビルドは別バンドルで、
 * それぞれ createContext を再評価すると別インスタンスになり "No value found for context" になるため、
 * SSR ビルド内で生成された唯一のインスタンスを共有する（entry.server が再エクスポートしている）。
 */
function createApp(build: ServerBuild, mode: 'development' | 'production'): Hono<Env> {
  const requestHandler = createRequestHandler(build, mode)
  // oxlint-disable-next-line typescript/consistent-type-assertions -- entry.server が実行時に付与する appLoadContext は ServerBuild の静的型に無いため
  const { appLoadContext } = build.entry.module as ServerBuild['entry']['module'] & {
    appLoadContext: RouterContext<AppLoadContext>
  }

  const app = new Hono<Env>()

  // API・共通ミドルウェア（securityHeaders 等）を先に通し、nonce 生成後に React Router へフォールバックする
  app.route('/', server)
  app.use(async (c) => {
    const context = new RouterContextProvider()
    context.set(appLoadContext, buildLoadContext(c))
    return requestHandler(c.req.raw, context)
  })

  return app
}
