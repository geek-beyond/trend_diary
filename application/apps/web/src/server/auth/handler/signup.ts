import { authClientConfig, PasswordAuthClient } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/account'
import { DiscordWebhookClient } from '@trend-diary/notification'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import type { authInputValidator } from '@/server/auth/validators'
import { handleError } from '@/server/error/handle-error'
import { unwrapAuth } from '../unwrap-auth'

export default async function signup(c: ZodValidatedContext<[typeof authInputValidator]>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const authClient = new PasswordAuthClient(authClientConfig(c))
  const user = unwrapAuth(
    await authClient.signUp({ email: valid.email, password: valid.password }),
    logger,
  )

  // NOTE: 認証ユーザー作成(signUp)は成功後にロールバックできないため、後続の registerActiveUser が
  // 失敗すると認証側に孤児ユーザーが残る。同期補償(認証ユーザーの削除)はSupabaseの管理者権限
  // (service_role)を要するが、サインアップ経路(anonクライアント)にadmin権限を持たせるべきではない
  // ため行わない。対応候補は service_role を持つ別cronで未紐付けの認証ユーザーを定期クリーンアップ
  // するなど。別イシューで再設計する。
  const accountUseCase = createAccountUseCase(getRdbClient(c.env.DB))
  const notifier = new DiscordWebhookClient(c.env.DISCORD_WEBHOOK_URL, logger)
  const result = await accountUseCase.registerActiveUser(
    user.email ?? valid.email,
    user.id,
    notifier,
  )
  if (result.isErr()) handleError(result.error, logger)

  logger.info('signup success', { activeUserId: result.value.activeUserId })

  return c.json({}, 201)
}
