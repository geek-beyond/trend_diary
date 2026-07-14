import { AlreadyExistsError, handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import getRdbClient from '@trend-diary/datastore/rdb'
import { type AuthInput, createAccountUseCase } from '@trend-diary/domain/user'
import { DiscordWebhookClient } from '@trend-diary/notification'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { verifyTurnstile } from '../captcha'

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
  const signUpResult = await wrapAsyncCall(() =>
    client.auth.signUp({ email: valid.email, password: valid.password }),
  )
  if (signUpResult.isErr()) throw handleError(new ServerError(signUpResult.error), logger)

  const { data, error } = signUpResult.value
  if (error) {
    // 既に存在するユーザーは明示する。UX上一般的であり、セキュリティリスクも比較的小さいと判断
    // NOTE: Supabaseは専用エラー型を提供しないためメッセージ文字列で判定している
    if (error.message.includes('already registered')) {
      throw handleError(new AlreadyExistsError('User already exists'), logger)
    }
    throw handleError(new ServerError(`Authentication service error: ${error.message}`), logger)
  }
  if (!data.user) throw handleError(new ServerError('User registration failed'), logger)

  // ロールバック不能な認証ユーザー作成が成功したときだけ、アカウント作成のドメイン処理を呼ぶ
  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const notifier = new DiscordWebhookClient(c.env.DISCORD_WEBHOOK_URL, logger)
  const result = await accountUseCase.registerActiveUser(
    data.user.email ?? valid.email,
    data.user.id,
    notifier,
  )
  if (result.isErr()) throw handleError(result.error, logger)

  logger.info('signup success', { activeUserId: result.value.activeUserId })

  return c.json({}, 201)
}
