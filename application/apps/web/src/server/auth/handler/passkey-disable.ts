import { handleError, ServerError } from '@trend-diary/common/errors'
import type { Context } from 'hono'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import { callSupabaseAuth } from '../supabase-auth'

export default async function passkeyDisable(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const listResult = await callSupabaseAuth(
    () => client.auth.passkey.list(),
    (error) => new ServerError(`Passkey list failed: ${error.message}`),
  )
  if (listResult.isErr()) throw handleError(listResult.error, logger)

  // トグルOFFは「パスキーを使わない」状態にすることなので、登録済みを全て削除する
  for (const passkey of listResult.value) {
    const deleteResult = await callSupabaseAuth(
      () => client.auth.passkey.delete({ passkeyId: passkey.id }),
      (error) => new ServerError(`Passkey deletion failed: ${error.message}`),
    )
    if (deleteResult.isErr()) throw handleError(deleteResult.error, logger)
  }

  return c.body(null, 204)
}
