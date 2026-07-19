import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import { setCookie } from 'hono/cookie'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedParamContext } from '@/middleware/zod-validator'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
import {
  buildOAuthCallbackUrl,
  OAUTH_COOKIE_OPTIONS,
  OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
  OAUTH_REDIRECT_COOKIE,
} from '@/server/oauth/redirect'
import type { OAuthProviderParam } from '@/server/oauth/schema'

export default async function oauthLink(c: ZodValidatedParamContext<OAuthProviderParam>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const { provider } = c.req.valid('param')

  const oauthClient = new OAuthClient(authClientConfig(c))
  const result = await oauthClient.startLink(provider, buildOAuthCallbackUrl(c, provider))
  if (result.isErr()) throw handleError(toAuthError(result.error), logger)

  // 連携は設定画面から始まる操作のため、完了後は設定画面へ戻す
  setCookie(c, OAUTH_FLOW_COOKIE, OAUTH_FLOW.link, OAUTH_COOKIE_OPTIONS)
  setCookie(c, OAUTH_REDIRECT_COOKIE, '/settings', OAUTH_COOKIE_OPTIONS)

  return c.redirect(result.value.url, 302)
}
