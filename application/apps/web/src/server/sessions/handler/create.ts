import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import { authInputSchema } from '@trend-diary/domain/account'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import respondActiveUserLogin from '@/server/active-user-login'
import { assertCaptchaVerified } from '@/server/captcha'
import unwrapOrThrowHttp from '@/server/error/unwrap-or-throw-http'
import throwHttpError from '@/server/sessions/error'

export const authInputValidator = zodValidator('json', authInputSchema)

export default async function createSession(c: ZodValidatedContext<[typeof authInputValidator]>) {
  const valid = c.req.valid('json')

  await assertCaptchaVerified(c.env.TURNSTILE_SECRET_KEY, valid.captchaToken)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const user = unwrapOrThrowHttp(
    await authClient.signIn({ email: valid.email, password: valid.password }),
    throwHttpError,
  )

  return respondActiveUserLogin(c, user.id, throwHttpError, 'session created')
}
