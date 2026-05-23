import type { Context } from 'hono'
import { handleError } from '@/common/errors'
import { isFailure } from '@/common/result'
import { createAuthUseCase } from '@/domain/user'
import getRdbClient from '@/infrastructure/rdb'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/web/middleware/context'

export default async function me(c: Context) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient({ db: c.env.DB, databaseUrl: c.env.DATABASE_URL })
  const useCase = createAuthUseCase(client, rdb)

  const activeUserResult = await useCase.getCurrentActiveUser()
  if (isFailure(activeUserResult)) {
    throw handleError(activeUserResult.error, logger)
  }

  const activeUser = activeUserResult.data

  logger.info('get current user success', { userId: activeUser.userId })

  return c.json({
    user: {
      displayName: activeUser.displayName,
    },
  })
}
