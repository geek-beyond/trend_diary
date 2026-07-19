import { DiscordNotifier } from '@trend-diary/notification'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../env'
import CONTEXT_KEY from './context'

interface RequestInfo {
  url: string
  method: string
  userAgent: string
}

const errorHandler = async (err: Error, c: Context<Env>): Promise<Response> => {
  const logger = c.get(CONTEXT_KEY.APP_LOG)

  // APP_LOG は request-logger が必ず設定する契約。未設定なら契約違反として送出し、握りつぶさない
  if (!logger) {
    throw new Error('APP_LOG must be set by request-logger before errorHandler runs')
  }

  const requestInfo: RequestInfo = {
    url: c.req.url,
    method: c.req.method,
    userAgent: c.req.header('User-Agent') || '',
  }

  const discordNotifier = new DiscordNotifier(c.env.DISCORD_WEBHOOK_URL, logger)

  if (err instanceof HTTPException) {
    const meta = {
      msg: 'http exception',
      status: err.status,
      path: c.req.path,
      method: c.req.method,
    }

    if (err.status >= 500) {
      logger.error(meta, err)
      await discordNotifier.error(err, requestInfo)
    } else {
      logger.warn(meta)
    }

    return c.json(
      {
        message: err.message,
      },
      {
        status: err.status,
      },
    )
  }

  logger.error('Unhandled error', err)
  await discordNotifier.error(err, requestInfo)

  return c.json('Internal Server Error', { status: 500 })
}

export default errorHandler
