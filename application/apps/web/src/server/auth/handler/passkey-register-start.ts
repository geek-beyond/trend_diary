import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import { handleError } from '@/server/handle-error'
import toAuthError from '../auth-error'

export default async function passkeyRegisterStart(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const result = await passkeyClient.startRegistration()
  if (result.isErr()) throw handleError(toAuthError(result.error), logger)

  return c.json({ challengeId: result.value.challenge_id, options: result.value.options }, 200)
}
