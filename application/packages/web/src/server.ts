import { Hono } from 'hono'
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

app.use('/api', timeout(5000))
app.route('/api', apiApp)

// SSR/ホットリロードのリクエスト処理は hono-react-router-adapter が担う:
// - dev: serverAdapter(@hono/vite-dev-server) が virtual:react-router/server-build を catch-all で処理
// - 本番: worker.ts の handle(build, server) が production モードで処理
export default app
