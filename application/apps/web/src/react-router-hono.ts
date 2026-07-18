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

/**
 * Hono の API アプリに React Router の SSR をフォールバックとして組み合わせた Hono アプリを組み立てる。
 * 本番（worker.ts）と dev（dev-server.ts）で build の供給元だけが異なる。
 *
 * context トークンは必ず build.entry.module から取得する。worker と SSR ビルドは別バンドルで、
 * それぞれ createContext を再評価すると別インスタンスになり "No value found for context" になるため、
 * SSR ビルド内で生成された唯一のインスタンスを共有する（entry.server が再エクスポートしている）。
 */
export function handle(build: ServerBuild): Hono<Env> {
  const requestHandler = createRequestHandler(build)
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
