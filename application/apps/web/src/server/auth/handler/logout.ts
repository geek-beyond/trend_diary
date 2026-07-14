import { handleError } from '@trend-diary/common/errors'
import type { Context } from 'hono'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import { callSupabaseAuth } from '../supabase-auth'

export default async function logout(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  // 既にログアウト済みでもSupabaseはエラーを返さないため、error は通信・サーバ障害のみを表す
  const result = await callSupabaseAuth(async () => ({
    ...(await client.auth.signOut()),
    data: null,
  }))
  if (result.isErr()) throw handleError(result.error, logger)

  logger.info('logout success')

  return c.body(null, 204)
}
