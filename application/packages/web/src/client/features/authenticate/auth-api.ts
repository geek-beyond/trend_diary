import type { AppLoadContext } from 'react-router'
import app from '@/server'

type AuthPostPath = '/api/auth/login' | '/api/auth/signup'

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

// 相対パスのままだとin-process呼び出しのリクエストURLが元リクエストのoriginを失うため絶対URL化する
function toApiUrl(path: string, request: Request): URL {
  return new URL(path, request.url)
}

// Cookie / CF-Connecting-IP 等を引き継がないと、API側の認証・レート制限が正しく動作しない
function buildForwardHeaders(request: Request): Headers {
  const headers = new Headers(request.headers)
  // 元リクエスト（フォーム）のボディ長が残っているとJSONボディと食い違うため取り除く
  headers.delete('Content-Length')
  return headers
}

/**
 * rateLimiter・zodValidatorといったAPI側のミドルウェアを本番経路（action）にも
 * 適用するため、ユースケースを直接呼ばずHono appを経由させる。
 */
export async function postAuthApi(
  request: Request,
  context: AppLoadContext,
  path: AuthPostPath,
  body: Record<string, unknown>,
): Promise<Response> {
  if (isCrossSiteFormPost(request)) {
    return new Response('Forbidden', { status: 403 })
  }

  const headers = buildForwardHeaders(request)
  headers.set('Content-Type', 'application/json')

  return app.request(
    toApiUrl(path, request),
    {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    },
    context.cloudflare.env,
  )
}

// GETは副作用がなくCSRFの対象外のため、同一オリジン検証は行わない
export async function getAuthSession(request: Request, context: AppLoadContext): Promise<Response> {
  return app.request(
    toApiUrl('/api/auth/me', request),
    { headers: buildForwardHeaders(request) },
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
