import { DiscordNotifier } from '@trend-diary/notification'
import { AssertionError } from '@trend-diary/std/contract'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { Env } from '../env'
import CONTEXT_KEY, { mustGet } from './context'

interface RequestInfo {
  url: string
  method: string
  userAgent: string
}

const errorHandler = async (err: Error, c: Context<Env>): Promise<Response> => {
  const logger = mustGet(c, CONTEXT_KEY.APP_LOG)

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

  // AssertionError は契約違反（バグ・データ破損）を表す。他の実行時エラーと区別してログに残し、
  // 原因の切り分けを早める。応答・通知は他の 5xx と同じく Internal Server Error とする
  if (err instanceof AssertionError) {
    logger.error({ msg: 'contract violation', path: c.req.path, method: c.req.method }, err)
    await discordNotifier.error(err, requestInfo)

    return c.json('Internal Server Error', { status: 500 })
  }

  logger.error('Unhandled error', err)
  await discordNotifier.error(err, requestInfo)

  return c.json('Internal Server Error', { status: 500 })
}

export default errorHandler
