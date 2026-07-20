import { Hono } from 'hono'
import type { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import rateLimiter from '@/middleware/rate-limiter'
import { authInputValidator } from '@/server/auth/validators'
import create from './handler/create'
import getCurrentSession from './handler/current'
import destroy from './handler/destroy'

const app = new Hono<Env>()
  .post('/', rateLimiter, authInputValidator, create)
  .delete('/', destroy)
  .get('/current', authenticator, getCurrentSession)

export default app
