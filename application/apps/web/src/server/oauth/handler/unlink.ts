import { authClientConfig, OAuthClient } from '@trend-diary/authentication'
import { ClientError, ServerError } from '@trend-diary/std/errors'
import CONTEXT_KEY from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { handleError } from '@/server/handle-error'
import type { oauthProviderParamValidator } from '@/server/oauth/schema'

export default async function oauthUnlink(
  c: ZodValidatedContext<[typeof oauthProviderParamValidator]>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const { provider } = c.req.valid('param')

  const oauthClient = new OAuthClient(authClientConfig(c))
  const identitiesResult = await oauthClient.listIdentities()
  // 連携一覧の取得が返す認証エラーはサーバ起因のみのため 500 に倒す
  if (identitiesResult.isErr()) handleError(new ServerError(identitiesResult.error), logger)

  const identities = identitiesResult.value
  const target = identities.find((identity) => identity.provider === provider)

  // トグルOFFの冪等性を保つため、未連携なら成功として何もしない
  if (!target) return c.body(null, 204)

  // 唯一のログイン手段を解除するとアカウントへ二度と入れなくなるため拒否する
  if (identities.length <= 1) {
    handleError(new ClientError('Cannot unlink the only login method', 400), logger)
  }

  const unlinkResult = await oauthClient.unlinkIdentity(target)
  // 連携解除が返す認証エラーはサーバ起因のみのため 500 に倒す
  if (unlinkResult.isErr()) handleError(new ServerError(unlinkResult.error), logger)

  return c.body(null, 204)
}
