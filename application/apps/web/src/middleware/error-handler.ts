import {
  AuthError,
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import type { LoggerType } from '@trend-diary/common/logger'
import Logger from '@trend-diary/common/logger'
import { DiscordNotifier } from '@trend-diary/notification'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Env } from '../env'
import CONTEXT_KEY from './context'

export interface RequestInfo {
  url: string
  method: string
  userAgent: string
}

// 認証パッケージのカスタムエラー → HTTPステータスの対応表。メッセージは元のエラーをそのまま引き継ぐ。
// 認証エラーは HTTP 責務を持たないため、HTTP 境界であるここで写像する。
const AUTH_ERROR_STATUS = new Map<
  abstract new (...args: never[]) => AuthError,
  ContentfulStatusCode
>([
  [InvalidCredentialsError, 401],
  [UserAlreadyExistsError, 409],
  [PasskeyRegistrationError, 400],
  [PasskeyVerificationError, 401],
  [NoSessionError, 401],
])

function toHttpException(error: AuthError): HTTPException {
  for (const [ErrorClass, status] of AUTH_ERROR_STATUS) {
    if (error instanceof ErrorClass) return new HTTPException(status, { message: error.message })
  }
  return new HTTPException(500, { message: error.message })
}

const errorHandler = async (err: Error, c: Context<Env>): Promise<Response> => {
  // errorHandler はロガーミドルウェア確立前にも起動しうるため、未設定の可能性を型に残す
  const logger: LoggerType | undefined = c.get(CONTEXT_KEY.APP_LOG)

  // 認証パッケージのカスタムエラーは HTTP 境界であるここで HTTPException へ写像する
  const normalizedError = err instanceof AuthError ? toHttpException(err) : err

  // Discord通知を送信（5xxエラーの場合）
  const discordWebhookUrl = c.env.DISCORD_WEBHOOK_URL
  const requestInfo: RequestInfo = {
    url: c.req.url,
    method: c.req.method,
    userAgent: c.req.header('User-Agent') || '',
  }

  // request-logger未設定時でも通知失敗を記録できるようにする
  const discordNotifier = new DiscordNotifier(
    discordWebhookUrl,
    logger ?? new Logger(c.env.LOG_LEVEL || 'info'),
  )
  if (normalizedError instanceof HTTPException) {
    if (normalizedError.status >= 500) {
      if (logger && typeof logger.error === 'function') {
        logger.error(
          {
            msg: 'http exception',
            status: normalizedError.status,
            path: c.req.path,
            method: c.req.method,
          },
          normalizedError,
        )
      } else {
        // oxlint-disable-next-line no-console -- request logger未設定時の最終フォールバック
        console.error('http exception', normalizedError)
      }
    } else if (logger && typeof logger.warn === 'function') {
      logger.warn({
        msg: 'http exception',
        status: normalizedError.status,
        path: c.req.path,
        method: c.req.method,
      })
    } else {
      // oxlint-disable-next-line no-console -- request logger未設定時の最終フォールバック
      console.warn('http exception', normalizedError)
    }

    if (normalizedError.status >= 500) await discordNotifier.error(normalizedError, requestInfo)

    return c.json(
      {
        message: normalizedError.message,
      },
      {
        status: normalizedError.status,
      },
    )
  }

  // 予期しないエラーの場合
  if (logger && typeof logger.error === 'function') {
    logger.error('Unhandled error', normalizedError)
  } else {
    // oxlint-disable-next-line no-console -- request logger未設定時の最終フォールバック
    console.error('Unhandled error', normalizedError)
  }
  await discordNotifier.error(normalizedError, requestInfo)

  return c.json('Internal Server Error', { status: 500 })
}

export default errorHandler
