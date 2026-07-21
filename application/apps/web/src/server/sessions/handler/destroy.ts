import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import { ServerError } from '@trend-diary/std/errors'
import type { Context } from 'hono'
import CONTEXT_KEY from '@/middleware/context'
import { handleError } from '@/server/handle-error'

export default async function destroySession(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const result = await authClient.signOut()
  // signOut が返す認証エラーはサーバ起因のみのため 500 に倒す
  if (result.isErr()) handleError(new ServerError(result.error), logger)

  logger.info('session destroyed')

  return c.body(null, 204)
}
