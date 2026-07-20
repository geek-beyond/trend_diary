import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import type { authInputValidator } from '@/server/auth/validators'
import { respondActiveUser } from '../respond-active-user'

export default async function login(c: ZodValidatedContext<[typeof authInputValidator]>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const authClient = new PasswordAuthClient(authClientConfig(c))
  return respondActiveUser(
    c,
    logger,
    await authClient.signIn({ email: valid.email, password: valid.password }),
    'login success',
  )
}
