import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'

// ログイン中ユーザーにpasskey登録の案内を出すか判定するため、登録有無だけを返す
export default async function passkeyStatus(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient(c.env.DB)
  const useCase = createAuthUseCase(client, rdb)

  const result = await useCase.hasRegisteredPasskey()
  if (result.isErr()) throw handleError(result.error, logger)

  return c.json({ hasPasskey: result.value }, 200)
}
