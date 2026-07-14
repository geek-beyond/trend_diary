import type { AuthError } from '@supabase/supabase-js'
import { ClientError, handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import getRdbClient from '@trend-diary/datastore/rdb'
import { type AuthInput, createAccountUseCase } from '@trend-diary/domain/user'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { verifyTurnstile } from '../captcha'

// 資格情報の誤りは環境を問わずGoTrue由来のAuthApiErrorとして返る（SDKが投げるAuthInvalidCredentialsErrorは
// メール/電話番号の入力欠落時のみで、ここには到達しない）。本番GoTrueはcode=invalid_credentialsを返すが、
// supa-emuはOAuth形式(error=invalid_grant)でcodeを持たない。両者ともメッセージは"Invalid login credentials"で一致するため、
// version差に強いcodeを優先しつつ、code非対応のsupa-emu向けに同一メッセージをfallbackとして環境差を吸収する
export function isInvalidCredentialsError(error: Pick<AuthError, 'code' | 'message'>): boolean {
  return (
    error.code === 'invalid_credentials' ||
    error.message.toLowerCase().includes('invalid login credentials')
  )
}

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
    if (isInvalidCredentialsError(error)) {
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
