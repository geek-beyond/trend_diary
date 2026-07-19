import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import type { AuthInput } from '@trend-diary/domain/account'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { createAccountUseCase } from '@/server/account/account-use-case'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
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

  const accountUseCase = createAccountUseCase(c)
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
