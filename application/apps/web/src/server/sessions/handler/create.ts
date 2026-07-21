import {
  authClientConfig,
  InvalidCredentialsError,
  PasswordAuthClient,
} from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { authInputSchema, createAccountUseCase } from '@trend-diary/domain/account'
import { ClientError, ServerError } from '@trend-diary/std/errors'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { assertCaptchaVerified } from '@/server/captcha'

export const authInputValidator = zodValidator('json', authInputSchema)

// 暫定: 認証ハンドラの契約由来の構造一致（registrations の create / passkeyLoginVerify との類似）を
// 共通化で解消するまで検出を抑制する。恒久対応は #1015
// similarity-ignore
export default async function createSession(c: ZodValidatedContext<[typeof authInputValidator]>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  await assertCaptchaVerified(c.env.TURNSTILE_SECRET_KEY, valid.captchaToken)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const loginResult = await authClient.signIn({ email: valid.email, password: valid.password })
  if (loginResult.isErr()) {
    // 認証パッケージのエラーは HTTP を知らないため、このハンドラで扱う InvalidCredentials だけを 401 に写像し、
    // それ以外はサーバ起因として 500 に倒す。HTTP への最終変換は errorHandler が担う
    throw loginResult.error instanceof InvalidCredentialsError
      ? new ClientError(loginResult.error.message, 401)
      : new ServerError(loginResult.error)
  }

  const user = loginResult.value

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const result = await accountUseCase.resolveActiveUser(user.id)
  if (result.isErr()) throw result.error

  logger.info('session created', { activeUserId: result.value.activeUserId })

  return c.json(
    {
      displayName: result.value.displayName,
    },
    200,
  )
}
