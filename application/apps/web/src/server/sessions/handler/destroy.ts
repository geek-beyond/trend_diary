import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import CONTEXT_KEY from '@/middleware/context'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'

export default async function destroySession(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const result = await authClient.signOut()
  if (result.isErr()) handleError(toAuthError(result.error), logger)

  logger.info('session destroyed')

  return c.body(null, 204)
}
