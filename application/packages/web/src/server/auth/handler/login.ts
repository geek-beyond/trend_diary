import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { type AuthInput, createAuthUseCase } from '@trend-diary/domain/user'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'

export default async function login(c: ZodValidatedContext<AuthInput>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient(c.env.DB)
  const useCase = createAuthUseCase(client, rdb, c.env.TURNSTILE_SECRET_KEY)

  const result = await useCase.login(valid.email, valid.password, valid.captchaToken)
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
