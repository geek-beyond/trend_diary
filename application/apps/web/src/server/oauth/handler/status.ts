import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { AUTH_ERROR_STATUS_TABLE } from '@/server/error/auth-error-status'
import throwHttpError from '@/server/error/throw-http-error'
import type { oauthProviderParamValidator } from '@/server/oauth/schema'

export default async function oauthStatus(
  c: ZodValidatedContext<[typeof oauthProviderParamValidator]>,
) {
  const { provider } = c.req.valid('param')

  const oauthClient = new OAuthClient(authClientConfig(c))
  const result = await oauthClient.listIdentities()
  if (result.isErr()) throwHttpError(result.error, AUTH_ERROR_STATUS_TABLE)

  const linked = result.value.some((identity) => identity.provider === provider)

  return c.json({ linked }, 200)
}
