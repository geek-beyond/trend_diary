import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { type AuthInput, createAccountUseCase } from '@trend-diary/domain/account'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { handleError } from '@/server/handle-error'
import toAuthError from '../auth-error'
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

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const loginResult = await authClient.signIn({ email: valid.email, password: valid.password })
  if (loginResult.isErr()) throw handleError(toAuthError(loginResult.error), logger)

  const user = loginResult.value

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
