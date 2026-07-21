import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import CONTEXT_KEY from '@/middleware/context'

export default async function destroySession(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const result = await authClient.signOut()
  if (result.isErr()) throw result.error

  logger.info('session destroyed')

  return c.body(null, 204)
}
