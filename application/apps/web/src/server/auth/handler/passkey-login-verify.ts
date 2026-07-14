import type { AuthenticationResponseJSON } from '@simplewebauthn/browser'
import { ClientError, handleError, ServerError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/user'
import { err, ok } from 'neverthrow'
import { z } from 'zod'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { callSupabaseAuth } from '../supabase-auth'

// 真正性はSupabaseが検証するため中身の妥当性検証はプロバイダに委ね、ここは認証 ceremony 結果を素通しする
export const passkeyLoginVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
})

export type PasskeyLoginVerifyInput = z.infer<typeof passkeyLoginVerifyInputSchema>

export default async function passkeyLoginVerify(c: ZodValidatedContext<PasskeyLoginVerifyInput>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const client = createSupabaseAuthClient(c)
  // 成功でも user/session が空なら認証失敗として err に畳み、後段でのResult外エラー処理を無くす
  const userResult = (
    await callSupabaseAuth(
      () =>
        client.auth.passkey.verifyAuthentication({
          challengeId: valid.challengeId,
          credential: valid.credential,
        }),
      () => new ClientError('Invalid passkey', 401),
    )
  ).andThen(({ user, session }) =>
    user && session ? ok(user) : err(new ServerError('Passkey authentication failed')),
  )
  if (userResult.isErr()) throw handleError(userResult.error, logger)

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const activeUserResult = await accountUseCase.resolveActiveUser(userResult.value.id)
  if (activeUserResult.isErr()) throw handleError(activeUserResult.error, logger)

  logger.info('passkey login success', { activeUserId: activeUserResult.value.activeUserId })

  return c.json(
    {
      displayName: activeUserResult.value.displayName,
    },
    200,
  )
}
