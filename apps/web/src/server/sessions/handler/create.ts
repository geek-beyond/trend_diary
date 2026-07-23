import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { authInputSchema, createAccountUseCase } from '@trend-diary/domain/account'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { assertCaptchaVerified } from '@/server/captcha'
import throwHttpError from '@/server/sessions/error'
import { unwrapOrThrowHttp } from '@/server/throw-http-error'

export const authInputValidator = zodValidator('json', authInputSchema)

export default async function createSession(c: ZodValidatedContext<[typeof authInputValidator]>) {
  const valid = c.req.valid('json')

  await assertCaptchaVerified(c.env.TURNSTILE_SECRET_KEY, valid.captchaToken)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const user = unwrapOrThrowHttp(
    await authClient.signIn({ email: valid.email, password: valid.password }),
    throwHttpError,
  )

  const accountUseCase = createAccountUseCase(getRdbClient(c.env.DB))
  // 認証成功後に active_user が無いのは孤児 auth ユーザー等のサーバ不整合なので、404 ではなく 500 に倒す
  const activeUser = unwrapOrThrowHttp(
    await accountUseCase.resolveActiveUser(user.id),
    throwHttpError,
  )

  c.get(CONTEXT_KEY.APP_LOG).info('session created', { activeUserId: activeUser.activeUserId })

  return c.json({ displayName: activeUser.displayName }, 200)
}
