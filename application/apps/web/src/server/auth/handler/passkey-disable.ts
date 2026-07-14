import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { handleError } from '@trend-diary/common/errors'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import toAuthError from '../auth-error'

export default async function passkeyDisable(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const listResult = await passkeyClient.list()
  if (listResult.isErr()) throw handleError(toAuthError(listResult.error), logger)

  // トグルOFFは「パスキーを使わない」状態にすることなので、登録済みを全て削除する
  for (const passkey of listResult.value) {
    const deleteResult = await passkeyClient.delete({ passkeyId: passkey.id })
    if (deleteResult.isErr()) throw handleError(toAuthError(deleteResult.error), logger)
  }

  return c.body(null, 204)
}
