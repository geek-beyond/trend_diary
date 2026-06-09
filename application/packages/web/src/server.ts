import { Hono } from 'hono'
import { csrf } from 'hono/csrf'
import { secureHeaders } from 'hono/secure-headers'
import { timeout } from 'hono/timeout'
import { Env } from './env'
import errorHandler from './middleware/error-handler'
import requestLogger from './middleware/request-logger'
import apiApp from './server/route'

const app = new Hono<Env>()

app.use(secureHeaders())
app.use(requestLogger)
app.onError(errorHandler)

// SameSite属性のみに依存せず、Origin検証による多層防御でCSRFを防ぐ
app.use('/api/*', csrf())
app.use('/api', timeout(5000))
app.route('/api', apiApp)

export default app
