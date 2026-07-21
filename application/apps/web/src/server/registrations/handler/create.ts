import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { authInputSchema, createAccountUseCase } from '@trend-diary/domain/account'
import { DiscordWebhookClient } from '@trend-diary/notification'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { assertCaptchaVerified } from '@/server/captcha'
import throwAccountHttpError from '@/server/error/account-error'
import throwHttpError from '@/server/registrations/error'

export const authInputValidator = zodValidator('json', authInputSchema)

export default async function createRegistration(
  c: ZodValidatedContext<[typeof authInputValidator]>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  await assertCaptchaVerified(c.env.TURNSTILE_SECRET_KEY, valid.captchaToken)

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const userResult = await authClient.signUp({ email: valid.email, password: valid.password })
  if (userResult.isErr()) throwHttpError(userResult.error)

  const user = userResult.value

  // ロールバック不能な認証ユーザー作成が成功したときだけ、アカウント作成のドメイン処理を呼ぶ
  // NOTE: ここで失敗すると認証側に孤児ユーザーが残る。同期補償(認証ユーザーの削除)はSupabaseの
  // 管理者権限(service_role)を要するが、サインアップ経路(anonクライアント)にadmin権限を持たせる
  // べきではないため行わない。対応候補は service_role を持つ別cronで未紐付けの認証ユーザーを定期
  // クリーンアップするなど。別イシューで再設計する。
  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const notifier = new DiscordWebhookClient(c.env.DISCORD_WEBHOOK_URL, logger)
  const result = await accountUseCase.registerActiveUser(
    user.email ?? valid.email,
    user.id,
    notifier,
  )
  if (result.isErr()) throwAccountHttpError(result.error)

  logger.info('registration created', { activeUserId: result.value.activeUserId })

  return c.json({}, 201)
}
