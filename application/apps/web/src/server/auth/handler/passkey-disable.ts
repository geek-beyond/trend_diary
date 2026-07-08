import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import type { Env } from '@/env'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'

export default async function passkeyDisable(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient(c.env.DB)
  const useCase = createAuthUseCase(client, rdb)

  const result = await useCase.disablePasskeys()
  if (result.isErr()) throw handleError(result.error, logger)

  return c.body(null, 204)
}
