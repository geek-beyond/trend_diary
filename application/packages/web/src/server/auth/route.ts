import { authInputSchema } from '@trend-diary/domain/user'
import { Hono } from 'hono'
import { Env } from '@/env'
import { authenticator } from '@/middleware/authenticator'
import zodValidator from '@/middleware/zod-validator'
import login from './handler/login'
import logout from './handler/logout'
import me from './handler/me'
import signup from './handler/signup'

const app = new Hono<Env>()
  .post('/signup', zodValidator('json', authInputSchema), signup)
  .post('/login', zodValidator('json', authInputSchema), login)
  .delete('/logout', logout)
  .get('/me', authenticator, me)

export default app
