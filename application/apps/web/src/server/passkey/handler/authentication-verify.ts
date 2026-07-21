import type { AuthenticationResponseJSON } from '@simplewebauthn/browser'
import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { z } from 'zod'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import respondActiveUserLogin from '@/server/active-user-login'
import unwrapOrThrowHttp from '@/server/error/unwrap-or-throw-http'
import throwHttpError from '@/server/passkey/error'

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
  const valid = c.req.valid('json')

  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const user = unwrapOrThrowHttp(
    await passkeyClient.verifyAuthentication({
      challengeId: valid.challengeId,
      credential: valid.credential,
    }),
    throwHttpError,
  )

  return respondActiveUserLogin(c, user.id, throwHttpError, 'passkey login success')
}
