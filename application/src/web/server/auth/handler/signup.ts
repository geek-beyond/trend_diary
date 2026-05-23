import { ExternalServiceError, handleError } from '@/common/errors'
import { isFailure } from '@/common/result'
import { type AuthInput, createAuthUseCase } from '@/domain/user'
import getRdbClient from '@/infrastructure/rdb'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/web/middleware/context'
import { ZodValidatedContext } from '@/web/middleware/zod-validator'

export default async function signup(c: ZodValidatedContext<AuthInput>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const client = createSupabaseAuthClient(c)
  const rdb = getRdbClient({ db: c.env.DB, databaseUrl: c.env.DATABASE_URL })
  const useCase = createAuthUseCase(client, rdb)

  const result = await useCase.signup(valid.email, valid.password)
  if (isFailure(result)) {
    // 補償トランザクション失敗時のログ出力
    if (result.error instanceof ExternalServiceError) {
      logger.error(
        {
          msg: result.error.message,
          context: result.error.context,
          errors: {
            original: result.error.originalError.message,
            compensation: result.error.serviceError.message,
          },
        },
        result.error,
      )
    }
    throw handleError(result.error, logger)
  }

  const { activeUser } = result.data
  logger.info('signup success', { activeUserId: activeUser.activeUserId })

  return c.json({}, 201)
}
