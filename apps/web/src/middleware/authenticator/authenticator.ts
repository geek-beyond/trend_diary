import { createMiddleware } from 'hono/factory'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../../env'
import CONTEXT_KEY from '../context'
import { validateSession } from './validate'

const authenticator = createMiddleware<Env>(async (c, next) => {
  const validationResult = await validateSession(c)

  if (validationResult.isErr()) {
    throw new HTTPException(401, { message: 'login required' })
  }

  c.set(CONTEXT_KEY.SESSION_USER, validationResult.value.sessionUser)
  return next()
})

export default authenticator
