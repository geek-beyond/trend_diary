import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'

export default async function githubStatus(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const oauthClient = new OAuthClient(authClientConfig(c))
  const result = await oauthClient.listIdentities()
  if (result.isErr()) throw handleError(toAuthError(result.error), logger)

  const linked = result.value.some((identity) => identity.provider === 'github')

  return c.json({ linked }, 200)
}
