import { type AuthError } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/account'
import type { LoggerType } from '@trend-diary/logger'
import type { Context } from 'hono'
import type { Result } from 'neverthrow'
import type { Env } from '@/env'
import { handleError } from '@/server/error/handle-error'
import { unwrapAuth } from './unwrap-auth'

// 認証結果を unwrap し、アクティブユーザーを解決して成功ログと displayName を返す。
// resolveActiveUser の err はドメイン由来のため toAuthError を通さない。
export async function respondActiveUser<TUser extends { id: string }>(
  c: Context<Env>,
  logger: LoggerType,
  authResult: Result<TUser, AuthError>,
  successMessage: string,
) {
  const user = unwrapAuth(authResult, logger)

  const accountUseCase = createAccountUseCase(getRdbClient(c.env.DB))
  const result = await accountUseCase.resolveActiveUser(user.id)
  if (result.isErr()) handleError(result.error, logger)

  logger.info(successMessage, { activeUserId: result.value.activeUserId })

  return c.json({ displayName: result.value.displayName }, 200)
}
