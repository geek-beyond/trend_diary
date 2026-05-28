import { handleError } from '@/common/errors'
import { type AuthInput, createAuthUseCase } from '@/domain/user'
import getRdbClient from '@/infrastructure/rdb'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/web/middleware/context'
import { ZodValidatedContext } from '@/web/middleware/zod-validator'

export default async function login(c: ZodValidatedContext<AuthInput>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient({ db: c.env.DB, databaseUrl: c.env.DATABASE_URL })
  const useCase = createAuthUseCase(client, rdb)

  const result = await useCase.login(valid.email, valid.password)
  if (result.isErr()) throw handleError(result.error, logger)

  const { activeUser } = result.value
  logger.info('login success', { activeUserId: activeUser.activeUserId })

  return c.json(
    {
      displayName: activeUser.displayName,
    },
    200,
  )
}
