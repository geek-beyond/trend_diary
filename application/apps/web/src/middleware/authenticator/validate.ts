import { ClientError, ServerError } from '@trend-diary/common/errors'
import type { LoggerType } from '@trend-diary/common/logger'
import getRdbClient from '@trend-diary/datastore/rdb'
import { type CurrentUser, createAccountUseCase } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import { err, ok, type Result } from 'neverthrow'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import type { Env, SessionUser } from '../../env'
import CONTEXT_KEY from '../context'

interface AuthValidationSuccess {
  sessionUser: SessionUser
}

type AuthValidationReason = 'no_session' | 'validation_failed' | 'user_not_found'

type AuthValidationError = Error & {
  reason: AuthValidationReason
}

function createAuthValidationError(
  reason: AuthValidationReason,
  message: string,
): AuthValidationError {
  return Object.assign(new Error(message), { reason })
}

/**
 * 認証プロバイダ(Supabase)のセッションを検証し、認証IDを取り出す。
 *
 * ドメインに依存しないため、外部境界である Supabase だけを差し替えれば単体で検証できる。
 */
export async function verifySessionClaims(
  c: Context<Env>,
): Promise<Result<{ authenticationId: string }, AuthValidationError>> {
  const client = createSupabaseAuthClient(c)
  const { data, error } = await client.auth.getClaims()
  // 検証失敗(改ざん・期限切れ等)やセッション無しは、認証ゲートでは未認証として扱う
  if (error || !data) {
    return err(createAuthValidationError('no_session', 'No session found'))
  }
  return ok({ authenticationId: data.claims.sub })
}

/**
 * ドメインのアカウント解決結果を、認証ゲートのセッションユーザーへ射影する。
 *
 * アカウント解決そのものの分岐はドメインのユースケースで検証するため、ここでは
 * 解決結果(Result)の射影とログ出力だけを担い、ドメインをモックせず値で検証できるようにする。
 */
export function toSessionUser(
  result: Result<CurrentUser, Error>,
  logger: LoggerType,
): Result<AuthValidationSuccess, AuthValidationError> {
  if (result.isErr()) {
    if (result.error instanceof ClientError || result.error instanceof ServerError) {
      logger.warn('Session validation failed', { error: result.error })
    } else {
      logger.error('Unexpected error occurred', { error: result.error })
    }
    return err(createAuthValidationError('validation_failed', 'Session validation failed'))
  }

  // 認可判断に不要な内部項目(authenticationId 等)をセッションユーザーへ漏らさない
  const sessionUser: SessionUser = {
    activeUserId: result.value.activeUserId,
    displayName: result.value.displayName,
    email: result.value.email,
  }
  return ok({ sessionUser })
}

export async function validateSession(
  c: Context<Env>,
): Promise<Result<AuthValidationSuccess, AuthValidationError>> {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  try {
    const claimsResult = await verifySessionClaims(c)
    if (claimsResult.isErr()) {
      return err(claimsResult.error)
    }

    const rdb = getRdbClient(c.env.DB)
    const accountUseCase = createAccountUseCase(rdb)
    const result = await accountUseCase.resolveActiveUser(claimsResult.value.authenticationId)
    return toSessionUser(result, logger)
  } catch (error) {
    logger.warn('Session validation setup failed', { error })
    return err(createAuthValidationError('validation_failed', 'Session validation failed'))
  }
}
