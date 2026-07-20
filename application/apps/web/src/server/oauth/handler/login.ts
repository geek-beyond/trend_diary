import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import { resolveLoginRedirectTarget } from '@trend-diary/std/sanitization'
import { deleteCookie, setCookie } from 'hono/cookie'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
import {
  buildOAuthCallbackUrl,
  OAUTH_COOKIE_OPTIONS,
  OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/server/oauth/redirect'
import type { oauthLoginQueryValidator, oauthProviderParamValidator } from '@/server/oauth/schema'

export default async function oauthLogin(
  c: ZodValidatedContext<[typeof oauthProviderParamValidator, typeof oauthLoginQueryValidator]>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const { provider } = c.req.valid('param')
  const { redirect } = c.req.valid('query')

  const oauthClient = new OAuthClient(authClientConfig(c))
  const result = await oauthClient.startAuthorization(provider, buildOAuthCallbackUrl(c, provider))
  if (result.isErr()) throw handleError(toAuthError(result.error), logger)

  setCookie(c, OAUTH_FLOW_COOKIE, OAUTH_FLOW.login, OAUTH_COOKIE_OPTIONS)

  const redirectTarget = resolveLoginRedirectTarget(redirect)
  if (redirectTarget) {
    setCookie(c, OAUTH_REDIRECT_COOKIE, redirectTarget, OAUTH_COOKIE_OPTIONS)
  } else {
    // 直前の未完了フローの戻り先が残っていると誤った画面へ戻すため、必ずクリアする
    deleteCookie(c, OAUTH_REDIRECT_COOKIE, { path: OAUTH_COOKIE_OPTIONS.path })
  }

  return c.redirect(result.value.url, 302)
}
