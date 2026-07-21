import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { AUTH_ERROR_STATUS_TABLE } from '@/server/error/auth-error-status'
import throwHttpError from '@/server/error/throw-http-error'
import type { oauthProviderParamValidator } from '@/server/oauth/schema'

export default async function oauthUnlink(
  c: ZodValidatedContext<[typeof oauthProviderParamValidator]>,
) {
  const { provider } = c.req.valid('param')

  const oauthClient = new OAuthClient(authClientConfig(c))
  const identitiesResult = await oauthClient.listIdentities()
  if (identitiesResult.isErr()) throwHttpError(identitiesResult.error, AUTH_ERROR_STATUS_TABLE)

  const identities = identitiesResult.value
  const target = identities.find((identity) => identity.provider === provider)

  // トグルOFFの冪等性を保つため、未連携なら成功として何もしない
  if (!target) return c.body(null, 204)

  // 唯一のログイン手段を解除するとアカウントへ二度と入れなくなるため拒否する
  if (identities.length <= 1) {
    throw new HTTPException(400, { message: 'Cannot unlink the only login method' })
  }

  const unlinkResult = await oauthClient.unlinkIdentity(target)
  if (unlinkResult.isErr()) throwHttpError(unlinkResult.error, AUTH_ERROR_STATUS_TABLE)

  return c.body(null, 204)
}
