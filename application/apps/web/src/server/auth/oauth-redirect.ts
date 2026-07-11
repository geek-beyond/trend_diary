import type { Context } from 'hono'

// OAuth完了後に戻す先。認可プロバイダへのリダイレクトを跨いで状態を保持するためCookieに載せる
export const OAUTH_REDIRECT_COOKIE = 'oauth_redirect_to'

// callbackにだけ送られれば十分なため、OAuthエンドポイント配下にスコープを絞る
export const OAUTH_REDIRECT_COOKIE_OPTIONS = {
  path: '/api/auth/oauth',
  httpOnly: true,
  secure: true,
  // 認可プロバイダからのcallbackはクロスサイトのトップレベル遷移のため、Strictでは送信されない
  sameSite: 'Lax',
  maxAge: 600,
} as const

// 判定用の仮想オリジン。実行環境のオリジンに依存させないための固定値
const REDIRECT_BASE_URL = 'https://safe.internal'

// ログイン後にここへ戻すと再びログインへ迷い込むだけの遷移になるため除外する
const LOGIN_FLOW_PATHS = ['/login', '/signup']

// 外部ドメインへの誤誘導（オープンリダイレクト）を防ぐ。Cookieはクライアントが自由に
// 書き換えられる前提で、開始時だけでなくcallbackでの読み出し時にも必ず通す。
// クライアント側のresolveLoginRedirectTargetと同等だが、サーバーからクライアント層への
// importは層の逆流になるためサーバー側に持つ
export function resolveOAuthRedirectTarget(
  rawValue: string | null | undefined,
): string | undefined {
  if (!rawValue || !rawValue.startsWith('/')) return undefined

  try {
    const url = new URL(rawValue, REDIRECT_BASE_URL)
    if (url.origin !== REDIRECT_BASE_URL) return undefined
    if (LOGIN_FLOW_PATHS.includes(url.pathname)) return undefined

    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return undefined
  }
}

// Supabaseの認可完了後にブラウザを戻すアプリ側のcallback URL。
// 配信オリジンが環境ごとに異なるため、リクエストのオリジンから組み立てる
export function buildGithubCallbackUrl(c: Context): string {
  return `${new URL(c.req.url).origin}/api/auth/oauth/github/callback`
}
