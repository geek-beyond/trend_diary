import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'

export default async function passkeyDisable(c: Context<Env>) {
  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const listResult = await passkeyClient.list()
  if (listResult.isErr()) throw listResult.error

  // トグルOFFは「パスキーを使わない」状態にすることなので、登録済みを全て削除する
  for (const passkey of listResult.value) {
    const deleteResult = await passkeyClient.delete({ passkeyId: passkey.id })
    if (deleteResult.isErr()) throw deleteResult.error
  }

  return c.body(null, 204)
}
