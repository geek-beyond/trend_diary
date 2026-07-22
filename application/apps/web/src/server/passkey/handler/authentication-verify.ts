import type { AuthenticationResponseJSON } from '@simplewebauthn/browser'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/account'
import { err } from 'neverthrow'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { createPasskeyActionHandler } from '../passkey-action'

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

type PasskeyAuthenticationVerifyContext = ZodValidatedContext<
  [typeof passkeyAuthenticationVerifyValidator]
>

export default createPasskeyActionHandler({
  execute: async (passkeyClient, c: PasskeyAuthenticationVerifyContext) => {
    const valid = c.req.valid('json')
    const verified = await passkeyClient.verifyAuthentication({
      challengeId: valid.challengeId,
      credential: valid.credential,
    })
    if (verified.isErr()) return err(verified.error)

    // 認証成功後に active_user が無いのは孤児 auth ユーザー等のサーバ不整合なので、404 ではなく 500 に倒す
    const accountUseCase = createAccountUseCase(getRdbClient(c.env.DB))
    return accountUseCase.resolveActiveUser(verified.value.id)
  },
  respond: (c, activeUser) => {
    c.get(CONTEXT_KEY.APP_LOG).info('passkey login success', {
      activeUserId: activeUser.activeUserId,
    })

    return c.json({ displayName: activeUser.displayName }, 200)
  },
})
