import { handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import type { Context } from 'hono'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'

export default async function logout(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const result = await wrapAsyncCall(() => client.auth.signOut())

  // 既にログアウト済みの場合でもSupabaseはエラーを返さないため、
  // エラーが返ってきた場合は実際の問題（ネットワークエラー、サーバーエラーなど）
  if (result.isErr()) {
    logger.error('logout failed', { error: result.error })
    throw handleError(new ServerError(result.error), logger)
  }

  const { error } = result.value
  if (error) {
    logger.error('logout failed', { error })
    throw handleError(new ServerError(`Logout failed: ${error.message}`), logger)
  }

  logger.info('logout success')

  return c.body(null, 204)
}
