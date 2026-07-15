import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import CONTEXT_KEY from '@/middleware/context'
import { handleError } from '@/server/handle-error'
import toAuthError from '../auth-error'

export default async function logout(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const result = await authClient.signOut()
  if (result.isErr()) throw handleError(toAuthError(result.error), logger)

  logger.info('logout success')

  return c.body(null, 204)
}
