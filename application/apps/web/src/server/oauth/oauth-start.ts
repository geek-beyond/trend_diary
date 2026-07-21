import {
  type AuthError,
  authClientConfig,
  NoSessionError,
  OAuthClient,
  type OAuthProvider,
} from '@trend-diary/authentication'
import { ClientError, ServerError } from '@trend-diary/std/errors'
import { setCookie } from 'hono/cookie'
import type { Result } from 'neverthrow'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { handleError } from '@/server/handle-error'
import {
  buildOAuthCallbackUrl,
  OAUTH_COOKIE_OPTIONS,
  type OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
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
  // 戻り先Cookieは保存/クリアの判断がフローごとに異なるため、ファクトリーに分岐を持ち込まず設定側で制御する
  setRedirectCookie: (c: TContext) => void
}) {
  return async (c: TContext) => {
    const logger = mustGet(c, CONTEXT_KEY.APP_LOG)
    const { provider } = c.req.valid('param')

    const oauthClient = new OAuthClient(authClientConfig(c))
    const result = await config.start(oauthClient, provider, buildOAuthCallbackUrl(c, provider))
    if (result.isErr()) {
      // 認証パッケージのエラーは HTTP を知らないため、セッション不在だけを 401 に写像し、
      // それ以外はサーバ起因として 500 に倒す
      const authError = result.error
      const error =
        authError instanceof NoSessionError
          ? new ClientError(authError.message, 401)
          : new ServerError(authError)
      handleError(error, logger)
    }

    setCookie(c, OAUTH_FLOW_COOKIE, config.flow, OAUTH_COOKIE_OPTIONS)
    config.setRedirectCookie(c)

    return c.redirect(result.value.url, 302)
  }
}
