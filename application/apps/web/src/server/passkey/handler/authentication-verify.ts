import type { AuthenticationResponseJSON } from '@simplewebauthn/browser'
import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/account'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import throwAccountHttpError from '@/server/error/account-error'
import throwPasskeyHttpError from '@/server/passkey/error'

// 真正性はSupabaseが検証するため中身の妥当性検証はプロバイダに委ね、ここは認証 ceremony 結果を素通しする
export const passkeyAuthenticationVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
})

export const passkeyAuthenticationVerifyValidator = zodValidator(
  'json',
  passkeyAuthenticationVerifyInputSchema,
)

export default async function passkeyAuthenticationVerify(
  c: ZodValidatedContext<[typeof passkeyAuthenticationVerifyValidator]>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const userResult = await passkeyClient.verifyAuthentication({
    challengeId: valid.challengeId,
    credential: valid.credential,
  })
  if (userResult.isErr()) throwPasskeyHttpError(userResult.error)

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const activeUserResult = await accountUseCase.resolveActiveUser(userResult.value.id)
  if (activeUserResult.isErr()) throwAccountHttpError(activeUserResult.error)

  logger.info('passkey login success', { activeUserId: activeUserResult.value.activeUserId })

  return c.json(
    {
      displayName: activeUserResult.value.displayName,
    },
    200,
  )
}
