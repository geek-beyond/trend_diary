import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { ok } from 'neverthrow'
import { createClientHandler } from '../factory/client-handler'

export default createClientHandler({
  createClient: (c) => new PasskeyClient(authClientConfig(c)),
  // トグルOFFは「パスキーを使わない」状態にすることなので、登録済みを全て削除する
  authenticate: async (client) => {
    const listResult = await client.list()
    if (listResult.isErr()) return listResult
    for (const passkey of listResult.value) {
      const deleteResult = await client.delete({ passkeyId: passkey.id })
      if (deleteResult.isErr()) return deleteResult
    }
    return ok(undefined)
  },
  respond: (c) => c.body(null, 204),
})
