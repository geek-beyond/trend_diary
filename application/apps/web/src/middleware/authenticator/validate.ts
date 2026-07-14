import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/user'
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

// 認証プロバイダ(Supabase)のセッション検証結果を Result へ揃える。
// 検証失敗(error)もトークン無し(data なし)も、認証ゲートでは同じ未認証として扱う。
async function getSessionClaims(
  c: Context<Env>,
): Promise<Result<{ authenticationId: string }, AuthValidationError>> {
  const client = createSupabaseAuthClient(c)
  const { data, error } = await client.auth.getClaims()
  if (error || !data) {
    return err(createAuthValidationError('no_session', 'No session found'))
  }
  return ok({ authenticationId: data.claims.sub })
}

export async function validateSession(
  c: Context<Env>,
): Promise<Result<AuthValidationSuccess, AuthValidationError>> {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const claims = await getSessionClaims(c)
  if (claims.isErr()) {
    return err(claims.error)
  }

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const result = await accountUseCase.resolveActiveUser(claims.value.authenticationId)
  if (result.isErr()) {
    // アカウント解決の失敗(未検出・DBエラー)は想定済みのため warn に留める
    logger.warn('Session validation failed', { error: result.error })
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
