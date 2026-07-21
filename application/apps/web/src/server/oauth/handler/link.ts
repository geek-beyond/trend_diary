import { setCookie } from 'hono/cookie'
import { createOAuthStartHandler } from '@/server/oauth/oauth-start'
import { OAUTH_COOKIE_OPTIONS, OAUTH_FLOW, OAUTH_REDIRECT_COOKIE } from '@/server/oauth/redirect'

export default createOAuthStartHandler({
  start: (oauthClient, provider, callbackUrl) => oauthClient.startLink(provider, callbackUrl),
  flow: OAUTH_FLOW.link,
  // 連携は設定画面から始まる操作のため、完了後は設定画面へ戻す
  setRedirectCookie: (c) => setCookie(c, OAUTH_REDIRECT_COOKIE, '/settings', OAUTH_COOKIE_OPTIONS),
})
