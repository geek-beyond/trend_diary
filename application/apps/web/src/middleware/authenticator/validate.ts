import { ClientError, ServerError } from '@trend-diary/common/errors'
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

type AuthValidationError = Error & {
  reason: 'no_session' | 'validation_failed' | 'user_not_found'
}

/**
 * 認証エラーを作成
 */
function createAuthValidationError(
  reason: 'no_session' | 'validation_failed' | 'user_not_found',
  message: string,
): AuthValidationError {
  return Object.assign(new Error(message), { reason })
}

/**
 * セッション検証の共通ロジック（auth）
 * @param c Honoコンテキスト
 * @returns セッション検証結果
 */
export async function validateSession(
  c: Context<Env>,
): Promise<Result<AuthValidationSuccess, AuthValidationError>> {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  try {
    const client = createSupabaseAuthClient(c)
    const { data, error } = await client.auth.getClaims()
    // 検証失敗(改ざん・期限切れ等)やセッション無しは、認証ゲートでは未認証として扱う
    if (error || !data) {
      return err(createAuthValidationError('no_session', 'No session found'))
    }

    const rdb = getRdbClient(c.env.DB)
    const accountUseCase = createAccountUseCase(rdb)
    const result = await accountUseCase.resolveActiveUser(data.claims.sub)
    if (result.isErr()) {
      if (result.error instanceof ClientError || result.error instanceof ServerError) {
        logger.warn('Session validation failed', { error: result.error })
      } else {
        logger.error('Unexpected error occurred', { error: result.error })
      }
      return err(createAuthValidationError('validation_failed', 'Session validation failed'))
    }

    const sessionUser: SessionUser = {
      activeUserId: result.value.activeUserId,
      displayName: result.value.displayName,
      email: result.value.email,
    }

    return ok({ sessionUser })
  } catch (error) {
    logger.warn('Session validation setup failed', { error })
    return err(createAuthValidationError('validation_failed', 'Session validation failed'))
  }
}
