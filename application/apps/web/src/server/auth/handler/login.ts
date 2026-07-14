import { ClientError, handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import getRdbClient from '@trend-diary/datastore/rdb'
import { type AuthInput, createAccountUseCase } from '@trend-diary/domain/user'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { verifyTurnstile } from '../captcha'

export default async function login(c: ZodValidatedContext<AuthInput>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const captchaSecret = c.env.TURNSTILE_SECRET_KEY
  // secret未設定の環境ではCAPTCHAを無効とみなす
  if (captchaSecret) {
    const captchaResult = await verifyTurnstile(captchaSecret, valid.captchaToken)
    if (captchaResult.isErr()) throw handleError(captchaResult.error, logger)
  }

  const client = createSupabaseAuthClient(c)
  const loginResult = await wrapAsyncCall(() =>
    client.auth.signInWithPassword({ email: valid.email, password: valid.password }),
  )
  if (loginResult.isErr()) throw handleError(new ServerError(loginResult.error), logger)

  const { data, error } = loginResult.value
  if (error) {
    if (error.code === 'invalid_credentials') {
      throw handleError(new ClientError('Invalid email or password', 401), logger)
    }
    throw handleError(new ServerError(`Authentication service error: ${error.message}`), logger)
  }
  if (!data.user || !data.session)
    throw handleError(new ServerError('Authentication failed'), logger)

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const result = await accountUseCase.resolveActiveUser(data.user.id)
  if (result.isErr()) throw handleError(result.error, logger)

  logger.info('login success', { activeUserId: result.value.activeUserId })

  return c.json(
    {
      displayName: result.value.displayName,
    },
    200,
  )
}
