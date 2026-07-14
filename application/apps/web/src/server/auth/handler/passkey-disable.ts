import { handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import type { Context } from 'hono'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'

export default async function passkeyDisable(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const listResult = await wrapAsyncCall(() => client.auth.passkey.list())
  if (listResult.isErr()) throw handleError(new ServerError(listResult.error), logger)

  const { data, error } = listResult.value
  if (error || !data) {
    throw handleError(new ServerError(`Passkey list failed: ${error?.message}`), logger)
  }

  // トグルOFFは「パスキーを使わない」状態にすることなので、登録済みを全て削除する
  for (const passkey of data) {
    const deleteResult = await wrapAsyncCall(() =>
      client.auth.passkey.delete({ passkeyId: passkey.id }),
    )
    if (deleteResult.isErr()) throw handleError(new ServerError(deleteResult.error), logger)
    if (deleteResult.value.error) {
      throw handleError(
        new ServerError(`Passkey deletion failed: ${deleteResult.value.error.message}`),
        logger,
      )
    }
  }

  return c.body(null, 204)
}
