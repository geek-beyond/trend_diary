import type { AuthenticationResponseJSON } from '@simplewebauthn/browser'
import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/account'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { ACCOUNT_ERROR_STATUS_TABLE } from '@/server/error/account-error-status'
import { AUTH_ERROR_STATUS_TABLE } from '@/server/error/auth-error-status'
import throwHttpError from '@/server/error/throw-http-error'

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
  if (userResult.isErr()) throwHttpError(userResult.error, AUTH_ERROR_STATUS_TABLE)

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const activeUserResult = await accountUseCase.resolveActiveUser(userResult.value.id)
  if (activeUserResult.isErr()) throwHttpError(activeUserResult.error, ACCOUNT_ERROR_STATUS_TABLE)

  logger.info('passkey login success', { activeUserId: activeUserResult.value.activeUserId })

  return c.json(
    {
      displayName: activeUserResult.value.displayName,
    },
    200,
  )
}
