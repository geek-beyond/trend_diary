import type { AuthenticationResponseJSON } from '@simplewebauthn/browser'
import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { respondActiveUser } from '../respond-active-user'

// 真正性はSupabaseが検証するため中身の妥当性検証はプロバイダに委ね、ここは認証 ceremony 結果を素通しする
export const passkeyLoginVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
})

export const passkeyLoginVerifyValidator = zodValidator('json', passkeyLoginVerifyInputSchema)

export default async function passkeyLoginVerify(
  c: ZodValidatedContext<[typeof passkeyLoginVerifyValidator]>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const passkeyClient = new PasskeyClient(authClientConfig(c))
  return respondActiveUser(
    c,
    logger,
    await passkeyClient.verifyAuthentication({
      challengeId: valid.challengeId,
      credential: valid.credential,
    }),
    'passkey login success',
  )
}
