import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import { isFailure } from '@/common/result'
import { Env } from '../../env'
import CONTEXT_KEY from '../context'
import { validateSession } from './validate'

const authenticator = createMiddleware<Env>(async (c, next) => {
  const validationResult = await validateSession(c)

  if (isFailure(validationResult)) {
    // ユーザーが見つからない場合は404、それ以外は401
    const statusCode = validationResult.error.reason === 'user_not_found' ? 404 : 401
    throw new HTTPException(statusCode, { message: 'login required' })
  }

  c.set(CONTEXT_KEY.SESSION_USER, validationResult.value.sessionUser)
  return next()
})

export default authenticator
