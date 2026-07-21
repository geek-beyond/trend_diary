import { resolveLoginRedirectTarget } from '@trend-diary/std/sanitization'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { createOAuthStartHandler } from '@/server/oauth/oauth-start'
import { OAUTH_FLOW } from '@/server/oauth/redirect'
import type { oauthLoginQueryValidator, oauthProviderParamValidator } from '@/server/oauth/schema'

export default createOAuthStartHandler<
  ZodValidatedContext<[typeof oauthProviderParamValidator, typeof oauthLoginQueryValidator]>
>({
  start: (oauthClient, provider, callbackUrl) =>
    oauthClient.startAuthorization(provider, callbackUrl),
  flow: OAUTH_FLOW.login,
  // 外部URLへの誘導を防ぐため、redirectクエリは内部パスに解決できたときだけ戻り先として採用する
  resolveRedirectTarget: (c) => resolveLoginRedirectTarget(c.req.valid('query').redirect),
})
