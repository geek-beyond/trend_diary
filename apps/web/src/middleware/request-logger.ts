import Logger from '@trend-diary/logger'
import { createMiddleware } from 'hono/factory'
import { v4 as uuidv4 } from 'uuid'
import type { Env } from '../env'
import CONTEXT_KEY from './context'

const DEFAULT_LOG_LEVEL = 'info'

const requestLogger = createMiddleware<Env>(async (c, next) => {
  const requestId = uuidv4()
  const startTime = performance.now()

  const { method } = c.req
  const { path } = c.req
  const userAgent = c.req.header('user-agent')

  const configuredLogLevel = c.env.LOG_LEVEL
  const resolvedLogLevel =
    typeof configuredLogLevel === 'string' && configuredLogLevel.trim() !== ''
      ? configuredLogLevel
      : DEFAULT_LOG_LEVEL

  const logger = new Logger(resolvedLogLevel)
  const accessLogger = logger.with({
    request_id: requestId,
    method,
    path,
    user_agent: userAgent,
  })

  const appLogger = logger.with({
    request_id: requestId,
  })

  accessLogger.info('Request started')

  c.set(CONTEXT_KEY.APP_LOG, appLogger)
  await next()

  const responseTime = Math.round(performance.now() - startTime)
  accessLogger.info('Request completed', {
    status: c.res.status,
    response_time: responseTime,
  })
})

export default requestLogger
