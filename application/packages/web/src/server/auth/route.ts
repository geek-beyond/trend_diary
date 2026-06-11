import { authInputSchema } from '@trend-diary/domain/user'
import { Hono } from 'hono'
import { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import sameOriginGuard from '@/middleware/same-origin-guard'
import zodValidator from '@/middleware/zod-validator'
import login from './handler/login'
import logout from './handler/logout'
import me from './handler/me'
import signup from './handler/signup'

const app = new Hono<Env>()
  .post('/signup', sameOriginGuard, rateLimiter, zodValidator('json', authInputSchema), signup)
  .post('/login', sameOriginGuard, rateLimiter, zodValidator('json', authInputSchema), login)
  .delete('/logout', logout)
  .get('/me', authenticator, me)

export default app
