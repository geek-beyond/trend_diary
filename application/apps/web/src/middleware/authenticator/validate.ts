import { authClientConfig, SessionClient } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/account'
import type { Context } from 'hono'
import { err, ok, type Result } from 'neverthrow'
import type { Env, SessionUser } from '../../env'
import CONTEXT_KEY from '../context'

interface AuthValidationSuccess {
  sessionUser: SessionUser
}

type AuthValidationReason = 'no_session' | 'validation_failed' | 'user_not_found'

interface AuthValidationError extends Error {
  reason: AuthValidationReason
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

async function getSessionClaims(
  c: Context<Env>,
): Promise<Result<{ authenticationId: string }, AuthValidationError>> {
  const sessionClient = new SessionClient(authClientConfig(c))
  const claims = await sessionClient.getClaims()
  if (claims.isErr()) {
    return err(createAuthValidationError('no_session', 'No session found'))
  }
  return ok({ authenticationId: claims.value.authenticationId })
}

function createAuthValidationError(
  reason: AuthValidationReason,
  message: string,
): AuthValidationError {
  return Object.assign(new Error(message), { reason })
}
