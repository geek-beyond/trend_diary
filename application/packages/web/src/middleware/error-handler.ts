import Logger, { LoggerType } from '@trend-diary/common/logger'
import { DiscordNotifier } from '@trend-diary/notification'
import { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { Env } from '../env'
import CONTEXT_KEY from './context'

export interface RequestInfo {
  url: string
  method: string
  userAgent: string
}

const errorHandler = async (err: Error, c: Context<Env>): Promise<Response> => {
  const logger = c.get(CONTEXT_KEY.APP_LOG) as LoggerType | undefined

  // Discord通知を送信（5xxエラーの場合）
  const discordWebhookUrl = c.env.DISCORD_WEBHOOK_URL
  const requestInfo: RequestInfo = {
    url: c.req.url,
    method: c.req.method,
    userAgent: c.req.header('User-Agent') || '',
  }

  // request-logger未設定時でも通知失敗を記録できるようフォールバックのLoggerを用意する
  const discordNotifier = new DiscordNotifier(
    discordWebhookUrl,
    logger ?? new Logger(c.env.LOG_LEVEL || 'info'),
  )
  if (err instanceof HTTPException) {
    if (err.status >= 500) {
      if (logger && typeof logger.error === 'function') {
        logger.error(
          {
            msg: 'http exception',
            status: err.status,
            path: c.req.path,
            method: c.req.method,
          },
          err,
        )
      } else {
        // biome-ignore lint/suspicious/noConsole: request logger未設定時の最終フォールバック
        console.error('http exception', err)
      }
    } else if (logger && typeof logger.warn === 'function') {
      logger.warn({
        msg: 'http exception',
        status: err.status,
        path: c.req.path,
        method: c.req.method,
      })
    } else {
      // biome-ignore lint/suspicious/noConsole: request logger未設定時の最終フォールバック
      console.warn('http exception', err)
    }

    if (err.status >= 500) await discordNotifier.error(err, requestInfo)

    return c.json(
      {
        message: err.message,
      },
      {
        status: err.status,
      },
    )
  }

  // 予期しないエラーの場合
  if (logger && typeof logger.error === 'function') {
    logger.error('Unhandled error', err)
  } else {
    // biome-ignore lint/suspicious/noConsole: request logger未設定時の最終フォールバック
    console.error('Unhandled error', err)
  }
  await discordNotifier.error(err, requestInfo)

  return c.json('Internal Server Error', { status: 500 })
}

export default errorHandler
