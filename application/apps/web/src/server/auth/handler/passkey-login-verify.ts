import type { AuthenticationResponseJSON } from '@simplewebauthn/browser'
import { ClientError, handleError, ServerError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/user'
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
  const verifyResult = await callSupabaseAuth(
    () =>
      client.auth.passkey.verifyAuthentication({
        challengeId: valid.challengeId,
        credential: valid.credential,
      }),
    () => new ClientError('Invalid passkey', 401),
  )
  if (verifyResult.isErr()) throw handleError(verifyResult.error, logger)

  const { user, session } = verifyResult.value
  if (!user || !session) throw handleError(new ServerError('Passkey authentication failed'), logger)

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const activeUserResult = await accountUseCase.resolveActiveUser(user.id)
  if (activeUserResult.isErr()) throw handleError(activeUserResult.error, logger)

  logger.info('passkey login success', { activeUserId: activeUserResult.value.activeUserId })

  return c.json(
    {
      displayName: activeUserResult.value.displayName,
    },
    200,
  )
}
