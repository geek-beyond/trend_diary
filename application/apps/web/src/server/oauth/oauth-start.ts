import {
  type AuthError,
  authClientConfig,
  OAuthClient,
  type OAuthProvider,
} from '@trend-diary/authentication'
import { deleteCookie, setCookie } from 'hono/cookie'
import type { Result } from 'neverthrow'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
import {
  buildOAuthCallbackUrl,
  OAUTH_COOKIE_OPTIONS,
  type OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/server/oauth/redirect'
import type { oauthProviderParamValidator } from '@/server/oauth/schema'

type OAuthFlow = (typeof OAUTH_FLOW)[keyof typeof OAUTH_FLOW]

export type OAuthStartContext = ZodValidatedContext<[typeof oauthProviderParamValidator]>

export function createOAuthStartHandler<
  TContext extends OAuthStartContext = OAuthStartContext,
>(config: {
  start: (
    oauthClient: OAuthClient,
    provider: OAuthProvider,
    callbackUrl: string,
  ) => Promise<Result<{ url: string }, AuthError>>
  flow: OAuthFlow
  resolveRedirectTarget: (c: TContext) => string | undefined
}) {
  return async (c: TContext) => {
    const logger = mustGet(c, CONTEXT_KEY.APP_LOG)
    const { provider } = c.req.valid('param')

    const oauthClient = new OAuthClient(authClientConfig(c))
    const result = await config.start(oauthClient, provider, buildOAuthCallbackUrl(c, provider))
    if (result.isErr()) handleError(toAuthError(result.error), logger)

    setCookie(c, OAUTH_FLOW_COOKIE, config.flow, OAUTH_COOKIE_OPTIONS)

    const redirectTarget = config.resolveRedirectTarget(c)
    if (redirectTarget) {
      setCookie(c, OAUTH_REDIRECT_COOKIE, redirectTarget, OAUTH_COOKIE_OPTIONS)
    } else {
      // 直前の未完了フローの戻り先が残っていると誤った画面へ戻すため、必ずクリアする
      deleteCookie(c, OAUTH_REDIRECT_COOKIE, { path: OAUTH_COOKIE_OPTIONS.path })
    }

    return c.redirect(result.value.url, 302)
  }
}
