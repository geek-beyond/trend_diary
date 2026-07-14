import type { RegistrationResponseJSON } from '@simplewebauthn/browser'
import { ClientError, handleError, ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { z } from 'zod'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'

// 真正性はSupabaseが検証するため中身の妥当性検証はプロバイダに委ね、ここは登録 ceremony 結果を素通しする
export const passkeyRegisterVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.custom<RegistrationResponseJSON>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
})

export type PasskeyRegisterVerifyInput = z.infer<typeof passkeyRegisterVerifyInputSchema>

export default async function passkeyRegisterVerify(
  c: ZodValidatedContext<PasskeyRegisterVerifyInput>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const valid = c.req.valid('json')

  const client = createSupabaseAuthClient(c)
  const result = await wrapAsyncCall(() =>
    client.auth.passkey.verifyRegistration({
      challengeId: valid.challengeId,
      credential: valid.credential,
    }),
  )
  if (result.isErr()) throw handleError(new ServerError(result.error), logger)

  const { data, error } = result.value
  if (error || !data) {
    throw handleError(
      new ClientError(`Passkey registration failed: ${error?.message}`, 400),
      logger,
    )
  }

  logger.info('passkey registration success', { passkeyId: data.id })

  return c.json({ id: data.id }, 201)
}
