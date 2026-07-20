import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'

export default async function passkeyStatus(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const result = await passkeyClient.list()
  if (result.isErr()) handleError(toAuthError(result.error), logger)

  return c.json({ hasPasskey: result.value.length > 0 }, 200)
}
