import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import type { AuthInput } from '@trend-diary/domain/account'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { type AuthHandlerContext, createAuthHandler } from '../auth-handler-factory'
import { assertCaptchaVerified } from '../captcha'

export default createAuthHandler({
  createClient: (ctx) => new PasswordAuthClient(authClientConfig(ctx.c)),
  authenticate: async (client, ctx: AuthHandlerContext<AuthInput>) => {
    await assertCaptchaVerified(ctx.c.env.TURNSTILE_SECRET_KEY, ctx.json.captchaToken, ctx.logger)
    return client.signUp({ email: ctx.json.email, password: ctx.json.password })
  },
  // NOTE: 認証ユーザー作成(signUp)は成功後にロールバックできないため、後続の registerActiveUser が
  // 失敗すると認証側に孤児ユーザーが残る。同期補償(認証ユーザーの削除)はSupabaseの管理者権限
  // (service_role)を要するが、サインアップ経路(anonクライアント)にadmin権限を持たせるべきではない
  // ため行わない。対応候補は service_role を持つ別cronで未紐付けの認証ユーザーを定期クリーンアップ
  // するなど。別イシューで再設計する。
  resolveAccount: (accountUseCase, user, ctx: AuthHandlerContext<AuthInput>) =>
    accountUseCase.registerActiveUser(
      user.email ?? ctx.json.email,
      user.id,
      new DiscordWebhookClient(ctx.c.env.DISCORD_WEBHOOK_URL, ctx.logger),
    ),
  log: (currentUser, ctx) =>
    ctx.logger.info('signup success', { activeUserId: currentUser.activeUserId }),
  respond: (c) => c.json({}, 201),
})
