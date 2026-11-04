import type { RegistrationResponseJSON } from '@simplewebauthn/browser'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { createPasskeyActionHandler } from '../passkey-action'

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

type PasskeyRegistrationVerifyContext = ZodValidatedContext<
  [typeof passkeyRegistrationVerifyValidator]
>

export default createPasskeyActionHandler({
  execute: (passkeyClient, c: PasskeyRegistrationVerifyContext) => {
    const valid = c.req.valid('json')
    return passkeyClient.verifyRegistration({
      challengeId: valid.challengeId,
      // SimpleWebAuthn v14 の拡張可能な transport 型を Supabase の古い型へ変換せず JSON のまま渡すため
      // oxlint-disable-next-line typescript/consistent-type-assertions -- 境界でのみ型の不一致を吸収するため
      credential: valid.credential as Parameters<
        typeof passkeyClient.verifyRegistration
      >[0]['credential'],
    })
  },
  respond: (c, registered) => {
    c.get(CONTEXT_KEY.APP_LOG).info('passkey registration success', { passkeyId: registered.id })

    return c.json({ id: registered.id }, 201)
  },
})
