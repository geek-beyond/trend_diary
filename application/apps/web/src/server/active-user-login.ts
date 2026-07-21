import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/account'
import type { Context } from 'hono'
import type { Env } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import unwrapOrThrowHttp from '@/server/error/unwrap-or-throw-http'

// パスワードログインとパスキー認証が共有する「認証済みユーザー → active_user 解決 → 現在ユーザー(displayName)返却」
// という契約を集約する。認証手段ごとに異なるのは認証処理・エラー写像・ログ文言だけなので、それらは呼び出し側で与える
export default async function respondActiveUserLogin(
  c: Context<Env>,
  authenticationId: string,
  throwHttpError: (error: Error) => never,
  logMessage: string,
) {
  const accountUseCase = createAccountUseCase(getRdbClient(c.env.DB))
  // 認証成功後に active_user が無いのは孤児 auth ユーザー等のサーバ不整合なので、404 ではなく 500 に倒す
  const activeUser = unwrapOrThrowHttp(
    await accountUseCase.resolveActiveUser(authenticationId),
    throwHttpError,
  )

  c.get(CONTEXT_KEY.APP_LOG).info(logMessage, { activeUserId: activeUser.activeUserId })

  return c.json({ displayName: activeUser.displayName }, 200)
}
