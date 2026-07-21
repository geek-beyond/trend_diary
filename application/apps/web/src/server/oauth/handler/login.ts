import { resolveLoginRedirectTarget } from '@trend-diary/std/sanitization'
import { deleteCookie, setCookie } from 'hono/cookie'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { createOAuthStartHandler } from '@/server/oauth/oauth-start'
import { OAUTH_COOKIE_OPTIONS, OAUTH_FLOW, OAUTH_REDIRECT_COOKIE } from '@/server/oauth/redirect'
import type { oauthLoginQueryValidator, oauthProviderParamValidator } from '@/server/oauth/schema'

export default createOAuthStartHandler<
  ZodValidatedContext<[typeof oauthProviderParamValidator, typeof oauthLoginQueryValidator]>
>({
  start: (oauthClient, provider, callbackUrl) =>
    oauthClient.startAuthorization(provider, callbackUrl),
  flow: OAUTH_FLOW.login,
  setRedirectCookie: (c) => {
    // 外部URLへの誘導を防ぐため、redirectクエリは内部パスに解決できたときだけ戻り先として採用する
    const redirectTarget = resolveLoginRedirectTarget(c.req.valid('query').redirect)
    if (redirectTarget) {
      setCookie(c, OAUTH_REDIRECT_COOKIE, redirectTarget, OAUTH_COOKIE_OPTIONS)
    } else {
      // 直前の未完了フローの戻り先が残っていると誤った画面へ戻すため、必ずクリアする
      deleteCookie(c, OAUTH_REDIRECT_COOKIE, { path: OAUTH_COOKIE_OPTIONS.path })
    }
  },
})
