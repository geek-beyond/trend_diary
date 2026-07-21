import { Hono } from 'hono'
import type { Env } from '@/env'
import rateLimiter from '@/middleware/rate-limiter'
import create, { authInputValidator } from './handler/create'

const app = new Hono<Env>().post('/', rateLimiter, authInputValidator, create)

export default app
