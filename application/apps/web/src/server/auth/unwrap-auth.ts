import { type AuthError } from '@trend-diary/authentication'
import type { LoggerType } from '@trend-diary/logger'
import type { Result } from 'neverthrow'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'

// 認証クライアントの Result を unwrap する。err は toAuthError で HTTP エラーへ変換して送出する。
export function unwrapAuth<T>(result: Result<T, AuthError>, logger: LoggerType): T {
  if (result.isErr()) handleError(toAuthError(result.error), logger)
  return result.value
}
