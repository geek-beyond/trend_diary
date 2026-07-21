import type { RegistrationResponseJSON } from '@simplewebauthn/browser'
import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import throwHttpError from '@/server/error/auth-error'

// 真正性はSupabaseが検証するため中身の妥当性検証はプロバイダに委ね、ここは登録 ceremony 結果を素通しする
export const passkeyRegistrationVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.custom<RegistrationResponseJSON>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
})

export const passkeyRegistrationVerifyValidator = zodValidator(
  'json',
  passkeyRegistrationVerifyInputSchema,
)

export default async function passkeyRegistrationVerify(
  c: ZodValidatedContext<[typeof passkeyRegistrationVerifyValidator]>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const result = await passkeyClient.verifyRegistration({
    challengeId: valid.challengeId,
    credential: valid.credential,
  })
  if (result.isErr()) throwHttpError(result.error)

  logger.info('passkey registration success', { passkeyId: result.value.id })

  return c.json({ id: result.value.id }, 201)
}
