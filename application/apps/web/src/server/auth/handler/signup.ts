import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import type { AuthInput } from '@trend-diary/domain/account'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { type AuthHandlerContext, createAuthHandler } from '../auth-handler-factory'
import { assertCaptchaVerified } from '../captcha'

export default createAuthHandler({
  beforeAuthenticate: (ctx: AuthHandlerContext<AuthInput>) =>
    assertCaptchaVerified(ctx.c.env.TURNSTILE_SECRET_KEY, ctx.json.captchaToken, ctx.logger),
  createClient: (ctx) => new PasswordAuthClient(authClientConfig(ctx.c)),
  authenticate: (client, ctx: AuthHandlerContext<AuthInput>) =>
    client.signUp({ email: ctx.json.email, password: ctx.json.password }),
  // ロールバック不能な認証ユーザー作成が成功したときだけ、アカウント作成のドメイン処理を呼ぶ
  // NOTE: ここで失敗すると認証側に孤児ユーザーが残る。同期補償(認証ユーザーの削除)はSupabaseの
  // 管理者権限(service_role)を要するが、サインアップ経路(anonクライアント)にadmin権限を持たせる
  // べきではないため行わない。対応候補は service_role を持つ別cronで未紐付けの認証ユーザーを定期
  // クリーンアップするなど。別イシューで再設計する。
  resolveAccount: (accountUseCase, user, ctx) =>
    accountUseCase.registerActiveUser(
      user.email ?? ctx.json.email,
      user.id,
      new DiscordWebhookClient(ctx.c.env.DISCORD_WEBHOOK_URL, ctx.logger),
    ),
  logMessage: 'signup success',
  logPayload: (currentUser) => ({ activeUserId: currentUser.activeUserId }),
  respond: (c) => c.json({}, 201),
})
