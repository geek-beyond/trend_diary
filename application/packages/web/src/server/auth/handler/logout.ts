import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'

export default async function logout(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient(c.env.DB)
  const useCase = createAuthUseCase(client, rdb)

  // ログアウト処理を実行
  const result = await useCase.logout()

  // エラーが発生した場合はログに記録し、エラーレスポンスを返す
  // 既にログアウト済みの場合でもSupabaseはエラーを返さないため、
  // エラーが返ってきた場合は実際の問題（ネットワークエラー、サーバーエラーなど）
  if (result.isErr()) {
    logger.error('logout failed', { error: result.error })
    throw handleError(result.error, logger)
  }

  logger.info('logout success')

  return c.body(null, 204)
}
