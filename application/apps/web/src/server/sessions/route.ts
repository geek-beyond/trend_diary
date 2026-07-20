import { Hono } from 'hono'
import type { Env } from '@/env'
import rateLimiter from '@/middleware/rate-limiter'
import { authInputValidator } from '@/server/auth/validators'
import create from './handler/create'
import destroy from './handler/destroy'

const app = new Hono<Env>().post('/', rateLimiter, authInputValidator, create).delete('/', destroy)

export default app
