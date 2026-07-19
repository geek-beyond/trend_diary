import type { OAuthProvider } from '@trend-diary/authentication'
import type { Context } from 'hono'

// OAuth完了後に戻す先。認可プロバイダへのリダイレクトを跨いで状態を保持するためCookieに載せる
export const OAUTH_REDIRECT_COOKIE = 'oauth_redirect_to'

// callbackがログインフローと連携フローを見分けるためのCookie。戻り先パスからの推定では
// 「redirect=/settingsを指定したログイン」と連携を区別できないため、フロー種別を明示して持ち回る
export const OAUTH_FLOW_COOKIE = 'oauth_flow'

export const OAUTH_FLOW = {
  login: 'login',
  link: 'link',
} as const

// callbackにだけ送られれば十分なため、OAuthエンドポイント配下にスコープを絞る
export const OAUTH_COOKIE_OPTIONS = {
  path: '/api/oauth',
  httpOnly: true,
  secure: true,
  // 認可プロバイダからのcallbackはクロスサイトのトップレベル遷移のため、Strictでは送信されない
  sameSite: 'Lax',
  maxAge: 600,
} as const

// Supabaseの認可完了後にブラウザを戻すアプリ側のcallback URL。
// 配信オリジンが環境ごとに異なるため、リクエストのオリジンから組み立てる
export function buildOAuthCallbackUrl(c: Context, provider: OAuthProvider): string {
  return `${new URL(c.req.url).origin}/api/oauth/${provider}/callback`
}
