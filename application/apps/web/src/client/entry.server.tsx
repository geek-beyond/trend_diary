/**
 * By default, Remix will handle generating the HTTP Response for you.
 * You are free to delete this file if you'd like to,
 * but if you ever want it revealed again, you can run `npx remix reveal` ✨
 * For more information, see https://remix.run/file-conventions/entry.server
 */

import { renderToReadableStream } from 'react-dom/server'
import type {
  ActionFunctionArgs,
  EntryContext,
  LoaderFunctionArgs,
  RouterContextProvider,
} from 'react-router'
import { isRouteErrorResponse, ServerRouter } from 'react-router'
import { appLoadContext } from '@/load-context'

// worker/dev サーバは build.entry.module 経由でこのトークンを取得する。
// 別バンドル（worker）で createContext を再評価すると別インスタンスになり context が解決できないため、
// SSR ビルド内で生成した唯一のインスタンスを共有する。
export { appLoadContext }

export default async function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  reactRouterContext: EntryContext,
  loadContext: RouterContextProvider,
) {
  const nonce = loadContext.get(appLoadContext).nonce
  let statusCode = responseStatusCode
  const body = await renderToReadableStream(
    <ServerRouter context={reactRouterContext} url={request.url} nonce={nonce} />,
    {
      signal: request.signal,
      nonce,
      onError(error) {
        // Log streaming rendering errors from inside the shell
        // oxlint-disable-next-line no-console -- Remixのエラーを一応出す
        console.error(error)
        statusCode = 500
      },
    },
  )

  responseHeaders.set('Content-Type', 'text/html; charset=utf-8')
  return new Response(body, {
    headers: responseHeaders,
    status: statusCode,
  })
}

// 404エラー, abortされたリクエストの場合は不要なのでログ出力しない
// 参考: https://zenn.dev/mkizka/articles/0db9bc30e1f707#(1)-error%3A-no-route-matches-url-%22%2Ffoo%22
// oxlint-disable-next-line typescript/no-restricted-types -- React Router が渡す失敗値は任意の型となり確定できないため
export function handleError(error: unknown, { request }: LoaderFunctionArgs | ActionFunctionArgs) {
  if ((isRouteErrorResponse(error) && error.status === 404) || request.signal.aborted) {
    return
  }
}
