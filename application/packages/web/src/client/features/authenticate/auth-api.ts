import type { AppLoadContext } from 'react-router'
import app from '@/server'

interface AuthApiInput {
  path: '/api/auth/login' | '/api/auth/signup' | '/api/auth/me'
  method: 'GET' | 'POST'
  body?: Record<string, unknown>
}

/**
 * フォーム由来のリクエストをJSONへ変換すると hono/csrf の検査対象（フォーム系Content-Type）から
 * 外れてしまうため、クロスサイトのフォームPOSTによるログインCSRFはここで遮断する。
 * 判定条件は hono/csrf と同一（Sec-Fetch-Site / Originのいずれかが同一オリジンを示すこと）。
 */
function isCrossSiteFormPost(request: Request): boolean {
  const secFetchSite = request.headers.get('Sec-Fetch-Site')
  if (secFetchSite === 'same-origin') {
    return false
  }
  return request.headers.get('Origin') !== new URL(request.url).origin
}

/**
 * rateLimiter・zodValidatorといったAPI側のミドルウェアを本番経路（action/loader）にも
 * 適用するため、ユースケースを直接呼ばずHono appを経由させる。
 */
export async function callAuthApi(
  request: Request,
  context: AppLoadContext,
  { path, method, body }: AuthApiInput,
): Promise<Response> {
  if (method !== 'GET' && isCrossSiteFormPost(request)) {
    return new Response('Forbidden', { status: 403 })
  }

  // 相対パスのままだとin-process呼び出しのリクエストURLが元リクエストのoriginを失うため絶対URL化する
  const url = new URL(path, request.url)

  // Cookie / CF-Connecting-IP 等を引き継がないと、API側の認証・レート制限が正しく動作しない
  const headers = new Headers(request.headers)
  headers.set('Content-Type', 'application/json')
  // 元リクエスト（フォーム）のボディ長が残っているとJSONボディと食い違うため取り除く
  headers.delete('Content-Length')

  return app.request(
    url,
    {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    context.cloudflare.env,
  )
}

export function buildSetCookieHeaders(response: Response): Headers {
  const headers = new Headers()
  for (const setCookie of response.headers.getSetCookie()) {
    headers.append('Set-Cookie', setCookie)
  }
  return headers
}
