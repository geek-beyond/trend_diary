import { AlreadyExistsError, handleError, ServerError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { type AuthInput, createAccountUseCase } from '@trend-diary/domain/account'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { err, ok } from 'neverthrow'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { verifyTurnstile } from '../captcha'
import { callSupabaseAuth } from '../supabase-auth'

export default async function signup(c: ZodValidatedContext<AuthInput>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const captchaSecret = c.env.TURNSTILE_SECRET_KEY
  // secret未設定の環境ではCAPTCHAを無効とみなす
  if (captchaSecret) {
    const captchaResult = await verifyTurnstile(captchaSecret, valid.captchaToken)
    if (captchaResult.isErr()) throw handleError(captchaResult.error, logger)
  }

  const client = createSupabaseAuthClient(c)
  // 成功でも user が空なら登録失敗として err に畳み、後段でのResult外エラー処理を無くす
  const userResult = (
    await callSupabaseAuth(
      () => client.auth.signUp({ email: valid.email, password: valid.password }),
      toSignupError,
    )
  ).andThen(({ user }) => (user ? ok(user) : err(new ServerError('User registration failed'))))
  if (userResult.isErr()) throw handleError(userResult.error, logger)

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
  if (result.isErr()) throw handleError(result.error, logger)

  logger.info('signup success', { activeUserId: result.value.activeUserId })

  return c.json({}, 201)
}

// 既に存在するユーザーは409で明示する。UX上一般的でセキュリティリスクも比較的小さいと判断。
// NOTE: Supabaseは専用エラー型を提供しないためメッセージ文字列で判定している
function toSignupError(error: Error): Error {
  return error.message.includes('already registered')
    ? new AlreadyExistsError('User already exists')
    : new ServerError(`Authentication service error: ${error.message}`)
}
