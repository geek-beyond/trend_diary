import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/browser'
import { z } from 'zod'

// 真正性はSupabaseが検証するため中身の妥当性検証はプロバイダに委ね、ここは WebAuthn ceremony 結果を素通しする
export const passkeyVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.custom<RegistrationResponseJSON | AuthenticationResponseJSON>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
})

export type PasskeyVerifyInput = z.infer<typeof passkeyVerifyInputSchema>
