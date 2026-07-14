import { AuthInvalidCredentialsError } from '@supabase/supabase-js'
import { ClientError, handleError, ServerError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { type AuthInput, createAccountUseCase } from '@trend-diary/domain/account'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { verifyTurnstile } from '../captcha'
import { callSupabaseAuth } from '../supabase-auth'

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
  const loginResult = await callSupabaseAuth(
    () => client.auth.signInWithPassword({ email: valid.email, password: valid.password }),
    toLoginError,
  )
  if (loginResult.isErr()) throw handleError(loginResult.error, logger)

  const { user } = loginResult.value

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const result = await accountUseCase.resolveActiveUser(user.id)
  if (result.isErr()) throw handleError(result.error, logger)

  logger.info('login success', { activeUserId: result.value.activeUserId })

  return c.json(
    {
      displayName: result.value.displayName,
    },
    200,
  )
}

// 認証情報の不正は401、それ以外はサービス側の異常として500に振り分ける。
// 判定はinstanceofとメッセージの両方で行う（ローカルと本番でエラーの表現が異なり得るため）
function toLoginError(error: Error): Error {
  const message = error.message.toLowerCase()
  const isInvalidCredentials =
    error instanceof AuthInvalidCredentialsError ||
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials')
  return isInvalidCredentials
    ? new ClientError('Invalid email or password', 401)
    : new ServerError(`Authentication service error: ${error.message}`)
}
