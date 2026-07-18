import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import { ClientError } from '@trend-diary/common/errors'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'

export default async function githubUnlink(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const oauthClient = new OAuthClient(authClientConfig(c))
  const identitiesResult = await oauthClient.listIdentities()
  if (identitiesResult.isErr()) throw handleError(toAuthError(identitiesResult.error), logger)

  const identities = identitiesResult.value
  const github = identities.find((identity) => identity.provider === 'github')

  // トグルOFFの冪等性を保つため、未連携なら成功として何もしない
  if (!github) return c.body(null, 204)

  // 唯一のログイン手段を解除するとアカウントへ二度と入れなくなるため拒否する
  if (identities.length <= 1) {
    throw handleError(new ClientError('Cannot unlink the only login method', 400), logger)
  }

  const unlinkResult = await oauthClient.unlinkIdentity(github)
  if (unlinkResult.isErr()) throw handleError(toAuthError(unlinkResult.error), logger)

  return c.body(null, 204)
}
