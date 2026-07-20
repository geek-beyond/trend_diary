import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import { unwrapAuth } from '../unwrap-auth'

export default async function passkeyDisable(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const passkeys = unwrapAuth(await passkeyClient.list(), logger)

  // トグルOFFは「パスキーを使わない」状態にすることなので、登録済みを全て削除する
  for (const passkey of passkeys) {
    unwrapAuth(await passkeyClient.delete({ passkeyId: passkey.id }), logger)
  }

  return c.body(null, 204)
}
