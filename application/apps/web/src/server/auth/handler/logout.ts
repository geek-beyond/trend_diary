import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import { handleError } from '@trend-diary/common/errors'
import type { Context } from 'hono'
import CONTEXT_KEY from '@/middleware/context'

export default async function logout(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const result = await authClient.signOut()
  if (result.isErr()) throw handleError(result.error, logger)

  logger.info('logout success')

  return c.body(null, 204)
}
