import type { Env } from '@/env'
import serverApp from '@/server'
import TEST_ENV from '@/test/env'

// 実アプリと、ミドルウェア単体テストのローカル検証ルートのどちらにも投げられる最小の形
interface RequestableApp {
  request(
    input: string,
    requestInit: RequestInit,
    env?: Env['Bindings'],
  ): Response | Promise<Response>
}

export interface ApiRequestOptions {
  method?: string
  // オブジェクトを渡すと JSON 化し Content-Type: application/json を付与する
  // oxlint-disable-next-line typescript/no-restricted-types -- JSON 化できる任意形状のリクエストボディを受けるため
  json?: unknown
  // 事前に組み立てた生ボディを渡す（json と併用しない）
  body?: string
  // ボディ無しでも Content-Type: application/json を付ける。
  // csrf() は JSON Content-Type のリクエストを Origin 検証から除外するため、
  // logout など Origin を送らない状態変更リクエストで必要になる
  contentTypeJson?: boolean
  cookies?: string
  origin?: string
  // 既定は TEST_ENV。レートリミッタ検証などで差し替える
  env?: Env['Bindings']
  // 既定は実アプリ。ミドルウェア単体テストのローカルルートで差し替える
  app?: RequestableApp
}

export function apiRequest(
  path: string,
  options: ApiRequestOptions = {},
): Response | Promise<Response> {
  const {
    method = 'GET',
    json,
    body,
    contentTypeJson,
    cookies,
    origin,
    env = TEST_ENV,
    app = serverApp,
  } = options

  const headers: Record<string, string> = {}
  if (json !== undefined || contentTypeJson) {
    headers['Content-Type'] = 'application/json'
  }
  if (cookies) {
    headers.Cookie = cookies
  }
  if (origin) {
    headers.Origin = origin
  }

  return app.request(
    path,
    { method, headers, body: json !== undefined ? JSON.stringify(json) : body },
    env,
  )
}

export function findSetCookie(res: Response, prefix: string): string | undefined {
  return res.headers.getSetCookie().find((cookie) => cookie.startsWith(prefix))
}
