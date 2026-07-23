import { authClientConfig, OAuthClient, type OAuthProvider } from '@trend-diary/authentication'
import { setCookie } from 'hono/cookie'
import type { Err, Result } from 'neverthrow'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import throwHttpError from '@/server/oauth/error'
import {
  buildOAuthCallbackUrl,
  OAUTH_COOKIE_OPTIONS,
  type OAUTH_FLOW,
  OAUTH_FLOW_COOKIE,
} from '@/server/oauth/redirect'
import type { oauthProviderParamValidator } from '@/server/oauth/schema'

type OAuthFlow = (typeof OAUTH_FLOW)[keyof typeof OAUTH_FLOW]

export type OAuthStartContext = ZodValidatedContext<[typeof oauthProviderParamValidator]>

type ResultErr<TResult> = TResult extends Err<infer _TValue, infer TError> ? TError : never
// 境界の TError を手書きの基底型で緩めず、OAuthClient が実際に返すエラー集合を上限にする
type OAuthClientError = ResultErr<Awaited<ReturnType<OAuthClient[keyof OAuthClient]>>>

export function createOAuthStartHandler<
  TContext extends OAuthStartContext = OAuthStartContext,
  TError extends OAuthClientError = OAuthClientError,
>(config: {
  start: (
    oauthClient: OAuthClient,
    provider: OAuthProvider,
    callbackUrl: string,
  ) => Promise<Result<{ url: string }, TError>>
  flow: OAuthFlow
  // 戻り先Cookieは保存/クリアの判断がフローごとに異なるため、ファクトリーに分岐を持ち込まず設定側で制御する
  setRedirectCookie: (c: TContext) => void
}) {
  return async (c: TContext) => {
    const { provider } = c.req.valid('param')

    const oauthClient = new OAuthClient(authClientConfig(c))
    const result = await config.start(oauthClient, provider, buildOAuthCallbackUrl(c, provider))
    if (result.isErr()) throwHttpError(result.error)

    setCookie(c, OAUTH_FLOW_COOKIE, config.flow, OAUTH_COOKIE_OPTIONS)
    config.setRedirectCookie(c)

    return c.redirect(result.value.url, 302)
  }
}
