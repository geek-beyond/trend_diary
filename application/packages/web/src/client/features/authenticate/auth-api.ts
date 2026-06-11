import type { AppLoadContext } from 'react-router'
import app from '@/server'

interface AuthApiInput {
  path: '/api/auth/login' | '/api/auth/signup' | '/api/auth/me'
  method: 'GET' | 'POST'
  body?: Record<string, unknown>
}

/**
 * rateLimiter・csrf・zodValidatorといったAPI側のミドルウェアを本番経路（action/loader）にも
 * 適用するため、ユースケースを直接呼ばずHono appを経由させる。
 */
export async function callAuthApi(
  request: Request,
  context: AppLoadContext,
  { path, method, body }: AuthApiInput,
): Promise<Response> {
  // hono/csrf はOriginヘッダーとリクエストURLのホストを照合するため、相対パスではなく元リクエストのoriginで絶対URL化する
  const url = new URL(path, request.url)

  // Cookie / Origin / CF-Connecting-IP 等を引き継がないと、API側の認証・CSRF検証・レート制限が正しく動作しない
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
