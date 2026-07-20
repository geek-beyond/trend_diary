import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import type { AuthInput } from '@trend-diary/domain/account'
import { type AuthHandlerContext, createAccountAuthHandler } from '../auth-handler-factory'
import { assertCaptchaVerified } from '../captcha'

export default createAccountAuthHandler({
  createClient: (c) => new PasswordAuthClient(authClientConfig(c)),
  authenticate: async (client, ctx: AuthHandlerContext<AuthInput>) => {
    await assertCaptchaVerified(ctx.c.env.TURNSTILE_SECRET_KEY, ctx.json.captchaToken, ctx.logger)
    return client.signIn({ email: ctx.json.email, password: ctx.json.password })
  },
  resolveAccount: (accountUseCase, user) => accountUseCase.resolveActiveUser(user.id),
  log: (currentUser, ctx) =>
    ctx.logger.info('login success', { activeUserId: currentUser.activeUserId }),
  respond: (c, currentUser) => c.json({ displayName: currentUser.displayName }, 200),
})
