import { createMiddleware } from 'hono/factory'
import type { Env } from '../../env'
import CONTEXT_KEY from '../context'
import { validateSession } from './validate'

/**
 * オプショナル認証ミドルウェア
 * - セッションがあればSESSION_USERをセット
 * - セッションがない/無効でもエラーを投げずに次のハンドラーに進む
 */
const optionalAuthenticator = createMiddleware<Env>(async (c, next) => {
  const validationResult = await validateSession(c)

  if (validationResult.isOk()) {
    c.set(CONTEXT_KEY.SESSION_USER, validationResult.value.sessionUser)
  }

  return next()
})

export default optionalAuthenticator
