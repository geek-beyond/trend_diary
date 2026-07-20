import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'

// 暫定: 認証ハンドラの契約由来の構造一致（logout / passkeyLoginStart /
// passkeyRegisterStart / passkeyStatus との類似）を共通化で解消するまで検出を抑制する。恒久対応は #1015
// similarity-ignore
export default async function passkeyDisable(c: Context<Env>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const passkeyClient = new PasskeyClient(authClientConfig(c))
  const listResult = await passkeyClient.list()
  if (listResult.isErr()) handleError(toAuthError(listResult.error), logger)

  // トグルOFFは「パスキーを使わない」状態にすることなので、登録済みを全て削除する
  for (const passkey of listResult.value) {
    const deleteResult = await passkeyClient.delete({ passkeyId: passkey.id })
    if (deleteResult.isErr()) handleError(toAuthError(deleteResult.error), logger)
  }

  return c.body(null, 204)
}
