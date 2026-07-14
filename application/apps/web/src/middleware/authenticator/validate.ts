import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/user'
import type { Context } from 'hono'
import { err, ok, type Result } from 'neverthrow'
import { verifySessionAuthenticationId } from '@/infrastructure/supabase'
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

export async function validateSession(
  c: Context<Env>,
): Promise<Result<AuthValidationSuccess, AuthValidationError>> {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  const authenticationId = await verifySessionAuthenticationId(c)
  if (!authenticationId) {
    return err(createAuthValidationError('no_session', 'No session found'))
  }

  const rdb = getRdbClient(c.env.DB)
  const accountUseCase = createAccountUseCase(rdb)
  const result = await accountUseCase.resolveActiveUser(authenticationId)
  if (result.isErr()) {
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
