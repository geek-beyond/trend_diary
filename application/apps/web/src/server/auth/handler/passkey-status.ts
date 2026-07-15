import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { handleError } from '@trend-diary/common/errors'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'

export default async function passkeyStatus(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const result = await passkeyClient.list()
  if (result.isErr()) throw handleError(result.error, logger)

  return c.json({ hasPasskey: result.value.length > 0 }, 200)
}
