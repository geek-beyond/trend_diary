import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import type { oauthProviderParamValidator } from '@/server/oauth/schema'

export default async function oauthStatus(
  c: ZodValidatedContext<[typeof oauthProviderParamValidator]>,
) {
  const { provider } = c.req.valid('param')

  const oauthClient = new OAuthClient(authClientConfig(c))
  const result = await oauthClient.listIdentities()
  if (result.isErr()) throw result.error

  const linked = result.value.some((identity) => identity.provider === provider)

  return c.json({ linked }, 200)
}
