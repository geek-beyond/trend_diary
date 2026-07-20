import type { AuthenticationResponseJSON } from '@simplewebauthn/browser'
import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import { z } from 'zod'
import zodValidator from '@/middleware/zod-validator'
import { createAccountHandler } from '../factory/account-handler'
import type { AuthHandlerContext } from '../factory/context'

// 真正性はSupabaseが検証するため中身の妥当性検証はプロバイダに委ね、ここは認証 ceremony 結果を素通しする
export const passkeyLoginVerifyInputSchema = z.object({
  challengeId: z.string().min(1),
  credential: z.custom<AuthenticationResponseJSON>(
    (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
  ),
})

export const passkeyLoginVerifyValidator = zodValidator('json', passkeyLoginVerifyInputSchema)

type PasskeyLoginVerifyInput = z.infer<typeof passkeyLoginVerifyInputSchema>

export default createAccountHandler({
  createClient: (c) => new PasskeyClient(authClientConfig(c)),
  authenticate: (client, ctx: AuthHandlerContext<PasskeyLoginVerifyInput>) =>
    client.verifyAuthentication({
      challengeId: ctx.json.challengeId,
      credential: ctx.json.credential,
    }),
  resolveAccount: (accountUseCase, user) => accountUseCase.resolveActiveUser(user.id),
  log: (currentUser, ctx) =>
    ctx.logger.info('passkey login success', { activeUserId: currentUser.activeUserId }),
  respond: (c, currentUser) => c.json({ displayName: currentUser.displayName }, 200),
})
