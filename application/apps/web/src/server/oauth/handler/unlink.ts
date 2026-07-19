import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import { ClientError } from '@trend-diary/common/errors'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
import type { OAuthProviderParam } from '@/server/oauth/schema'

export default async function oauthUnlink(c: ZodValidatedContext<{ param: OAuthProviderParam }>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const { provider } = c.req.valid('param')

  const oauthClient = new OAuthClient(authClientConfig(c))
  const identitiesResult = await oauthClient.listIdentities()
  if (identitiesResult.isErr()) throw handleError(toAuthError(identitiesResult.error), logger)

  const identities = identitiesResult.value
  const target = identities.find((identity) => identity.provider === provider)

  // トグルOFFの冪等性を保つため、未連携なら成功として何もしない
  if (!target) return c.body(null, 204)

  // 唯一のログイン手段を解除するとアカウントへ二度と入れなくなるため拒否する
  if (identities.length <= 1) {
    throw handleError(new ClientError('Cannot unlink the only login method', 400), logger)
  }

  const unlinkResult = await oauthClient.unlinkIdentity(target)
  if (unlinkResult.isErr()) throw handleError(toAuthError(unlinkResult.error), logger)

  return c.body(null, 204)
}
