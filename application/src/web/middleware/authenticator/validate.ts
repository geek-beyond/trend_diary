import type { Context } from 'hono'
import { ClientError, ServerError } from '@/common/errors'
import UnauthorizedError from '@/common/errors/client-error/unauthorized-error'
import { failure, isFailure, type Result, success } from '@/common/result'
import { createAuthUseCase } from '@/domain/user'
import getRdbClient from '@/infrastructure/rdb'
import { createSupabaseAuthClient } from '@/infrastructure/supabase'
import type { Env, SessionUser } from '../../env'
import CONTEXT_KEY from '../context'

type AuthValidationSuccess = {
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
    const rdb = getRdbClient({ db: c.env.DB, databaseUrl: c.env.DATABASE_URL })
    const useCase = createAuthUseCase(supabaseClient, rdb)

    const result = await useCase.getCurrentActiveUser()
    if (isFailure(result)) {
      if (result.error instanceof UnauthorizedError) {
        return failure(createAuthValidationError('no_session', 'No session found'))
      }
      if (result.error instanceof ClientError || result.error instanceof ServerError) {
        logger.warn('Session validation failed', { error: result.error })
      } else {
        logger.error('Unexpected error occurred', { error: result.error })
      }
      return failure(createAuthValidationError('validation_failed', 'Session validation failed'))
    }

    if (!result.data) {
      return failure(createAuthValidationError('user_not_found', 'User not found'))
    }

    // 管理者権限をチェック
    const sessionUser: SessionUser = {
      activeUserId: result.data.activeUserId,
      displayName: result.data.displayName,
      email: result.data.email,
    }

    return success({ sessionUser })
  } catch (error) {
    logger.warn('Session validation setup failed', { error })
    return failure(createAuthValidationError('validation_failed', 'Session validation failed'))
  }
}
