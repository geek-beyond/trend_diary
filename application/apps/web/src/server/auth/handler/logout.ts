import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import CONTEXT_KEY from '@/middleware/context'
import { unwrapAuth } from '../unwrap-auth'

export default async function logout(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const authClient = new PasswordAuthClient(authClientConfig(c))
  unwrapAuth(await authClient.signOut(), logger)
  logger.info('logout success')
  return c.body(null, 204)
}
