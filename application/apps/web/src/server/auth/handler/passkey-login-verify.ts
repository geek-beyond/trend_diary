import { ClientError, handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase, type PasskeyVerifyInput } from '@trend-diary/domain/user'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'

export default async function passkeyLoginVerify(c: ZodValidatedContext<PasskeyVerifyInput>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const client = createSupabaseAuthClient(c)
  const result = await wrapAsyncCall(() =>
    client.auth.passkey.verifyAuthentication({
      challengeId: valid.challengeId,
      credential: valid.credential,
    }),
  )
  if (result.isErr()) throw handleError(new ServerError(result.error), logger)

  const { data, error } = result.value
  // 資格情報の不一致・失効などは認証失敗として401で返す
  if (error) throw handleError(new ClientError('Invalid passkey', 401), logger)
  if (!data?.user || !data.session) {
    throw handleError(new ServerError('Passkey authentication failed'), logger)
  }

  // ロールバック不能な認証が成功したときだけ、アカウント解決のドメイン処理を呼ぶ
  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const activeUserResult = await accountUseCase.resolveActiveUser(data.user.id)
  if (activeUserResult.isErr()) throw handleError(activeUserResult.error, logger)

  logger.info('passkey login success', { activeUserId: activeUserResult.value.activeUserId })

  return c.json(
    {
      displayName: activeUserResult.value.displayName,
    },
    200,
  )
}
