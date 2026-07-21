import { DiscordNotifier } from '@trend-diary/notification'
import { AssertionError } from '@trend-diary/std/contract'
import { ClientError, ExternalServiceError, ServerError } from '@trend-diary/std/errors'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
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
  const meta = { path: c.req.path, method: c.req.method }

  // ExternalServiceError は原因切り分けのため、通常の 5xx より詳細な文脈を構造化して残す
  // （ServerError の派生のため、下の共通処理より先に判定する）
  if (err instanceof ExternalServiceError) {
    logger.error(
      {
        msg: 'external service error',
        originalError: { message: err.originalError.message, stack: err.originalError.stack },
        serviceError: { message: err.serviceError.message, stack: err.serviceError.stack },
        context: err.context,
        ...meta,
      },
      err,
    )
    await discordNotifier.error(err, requestInfo)
    // oxlint-disable-next-line typescript/consistent-type-assertions -- statusCodeは任意のnumberを取り得るため、Honoが要求するContentfulStatusCodeへ実行時に絞り込めず型アサーションが避けられないため
    return c.json({ message: err.message }, { status: err.statusCode as ContentfulStatusCode })
  }

  // std error(ClientError/ServerError)と HTTPException はいずれも「HTTP ステータス＋メッセージ」を表す。
  // 5xx はサーバ障害として error ログ＋通知、それ以外は warn のみ、と同じ規則で応答する。
  const httpError =
    err instanceof HTTPException
      ? { status: err.status, message: err.message }
      : err instanceof ClientError || err instanceof ServerError
        ? { status: err.statusCode, message: err.message }
        : undefined
  if (httpError) {
    const httpMeta = { msg: 'http error', status: httpError.status, ...meta }
    if (httpError.status >= 500) {
      logger.error(httpMeta, err)
      await discordNotifier.error(err, requestInfo)
    } else {
      logger.warn(httpMeta)
    }
    // oxlint-disable-next-line typescript/consistent-type-assertions -- statusCodeは任意のnumberを取り得るため、Honoが要求するContentfulStatusCodeへ実行時に絞り込めず型アサーションが避けられないため
    const status = httpError.status as ContentfulStatusCode
    return c.json({ message: httpError.message }, { status })
  }

  // AssertionError は契約違反（バグ・データ破損）を表す。他の実行時エラーと区別してログに残し、
  // 原因の切り分けを早める。応答・通知は他の 5xx と同じく Internal Server Error とする
  if (err instanceof AssertionError) {
    logger.error({ msg: 'contract violation', ...meta }, err)
    await discordNotifier.error(err, requestInfo)

    return c.json('Internal Server Error', { status: 500 })
  }

  logger.error('Unhandled error', err)
  await discordNotifier.error(err, requestInfo)

  return c.json('Internal Server Error', { status: 500 })
}

export default errorHandler
