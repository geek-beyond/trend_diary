import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
import type { oauthProviderParamValidator } from '@/server/oauth/schema'

export default async function oauthStatus(
  c: ZodValidatedContext<[typeof oauthProviderParamValidator]>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const { provider } = c.req.valid('param')

  const oauthClient = new OAuthClient(authClientConfig(c))
  const result = await oauthClient.listIdentities()
  if (result.isErr()) handleError(toAuthError(result.error), logger)

  const linked = result.value.some((identity) => identity.provider === provider)

  return c.json({ linked }, 200)
}
