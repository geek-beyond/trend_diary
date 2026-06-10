import { Hono } from 'hono'
import { Env } from '@/env'
import health from './handler/health'

const app = new Hono<Env>().get('/', health)

export default app
