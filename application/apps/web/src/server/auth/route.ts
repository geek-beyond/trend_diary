import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import login from './handler/login'
import logout from './handler/logout'
import me from './handler/me'
import signup from './handler/signup'
import { authInputValidator } from './validators'

const app = new Hono<Env>()
  .post('/signup', rateLimiter, authInputValidator, signup)
  .post('/login', rateLimiter, authInputValidator, login)
  .delete('/logout', logout)
  .get('/me', authenticator, me)

export default app
