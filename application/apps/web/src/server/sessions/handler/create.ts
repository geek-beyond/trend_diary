import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { authInputSchema, createAccountUseCase } from '@trend-diary/domain/account'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { assertCaptchaVerified } from '@/server/captcha'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'

// signup / login は同一の入力スキーマを共有する
export const authInputValidator = zodValidator('json', authInputSchema)

// 暫定: 認証ハンドラの契約由来の構造一致（registrations の create / passkeyLoginVerify との類似）を
// 共通化で解消するまで検出を抑制する。恒久対応は #1015
// similarity-ignore
export default async function createSession(c: ZodValidatedContext<[typeof authInputValidator]>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  await assertCaptchaVerified(c.env.TURNSTILE_SECRET_KEY, valid.captchaToken, logger)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const loginResult = await authClient.signIn({ email: valid.email, password: valid.password })
  if (loginResult.isErr()) handleError(toAuthError(loginResult.error), logger)

  const user = loginResult.value

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const result = await accountUseCase.resolveActiveUser(user.id)
  if (result.isErr()) handleError(result.error, logger)

  logger.info('session created', { activeUserId: result.value.activeUserId })

  return c.json(
    {
      displayName: result.value.displayName,
    },
    200,
  )
}
