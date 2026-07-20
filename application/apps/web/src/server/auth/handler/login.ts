import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import type { AuthInput } from '@trend-diary/domain/account'
import { type AuthHandlerContext, createAuthHandler } from '../auth-handler-factory'
import { assertCaptchaVerified } from '../captcha'

export default createAuthHandler({
  beforeAuthenticate: (ctx: AuthHandlerContext<AuthInput>) =>
    assertCaptchaVerified(ctx.c.env.TURNSTILE_SECRET_KEY, ctx.json.captchaToken, ctx.logger),
  createClient: (ctx) => new PasswordAuthClient(authClientConfig(ctx.c)),
  authenticate: (client, ctx: AuthHandlerContext<AuthInput>) =>
    client.signIn({ email: ctx.json.email, password: ctx.json.password }),
  resolveAccount: (accountUseCase, user) => accountUseCase.resolveActiveUser(user.id),
  log: (currentUser, ctx) =>
    ctx.logger.info('login success', { activeUserId: currentUser.activeUserId }),
  respond: (c, currentUser) => c.json({ displayName: currentUser.displayName }, 200),
})
