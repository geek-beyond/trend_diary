import { ClientError, ServerError } from '@trend-diary/common/errors'
import UnauthorizedError from '@trend-diary/common/errors/client-error/unauthorized-error'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAuthUseCase } from '@trend-diary/domain/user'
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
  const error = new Error(message) as AuthValidationError
  error.reason = reason
  return error
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
    const supabaseClient = createSupabaseAuthClient(c)
    const rdb = getRdbClient(c.env.DB)
    const useCase = createAuthUseCase(supabaseClient, rdb)

    const result = await useCase.getCurrentActiveUser()
    if (result.isErr()) {
      if (result.error instanceof UnauthorizedError) {
        return err(createAuthValidationError('no_session', 'No session found'))
      }
      if (result.error instanceof ClientError || result.error instanceof ServerError) {
        logger.warn('Session validation failed', { error: result.error })
      } else {
        logger.error('Unexpected error occurred', { error: result.error })
      }
      return err(createAuthValidationError('validation_failed', 'Session validation failed'))
    }

    // 管理者権限をチェック
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
