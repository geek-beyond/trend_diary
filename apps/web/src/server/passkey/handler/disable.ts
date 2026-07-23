import { err, ok } from 'neverthrow'
import { createPasskeyActionHandler } from '../passkey-action'

export default createPasskeyActionHandler({
  // トグルOFFは「パスキーを使わない」状態にすることなので、登録済みを全て削除する
  execute: async (passkeyClient) => {
    const listResult = await passkeyClient.list()
    if (listResult.isErr()) return err(listResult.error)

    for (const passkey of listResult.value) {
      const deleteResult = await passkeyClient.delete({ passkeyId: passkey.id })
      if (deleteResult.isErr()) return err(deleteResult.error)
    }

    return ok(null)
  },
  respond: (c) => c.body(null, 204),
})
