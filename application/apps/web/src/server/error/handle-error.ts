import type { LoggerType } from '@trend-diary/logger'
import { ClientError, ExternalServiceError, ServerError } from '@trend-diary/std/errors'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export function handleError(error: Error, logger: LoggerType): never {
  if (error instanceof ClientError) {
    logger.warn('client error', error)
    // oxlint-disable-next-line typescript/consistent-type-assertions -- statusCodeは任意のnumberを取り得るため、Honoが要求するContentfulStatusCodeへ実行時に絞り込めず型アサーションが避けられないため
    throw new HTTPException(error.statusCode as ContentfulStatusCode, {
      message: error.message,
    })
  }

  if (error instanceof ExternalServiceError) {
    logger.error(
      {
        msg: 'external service error',
        originalError: {
          message: error.originalError.message,
          stack: error.originalError.stack,
        },
        serviceError: {
          message: error.serviceError.message,
          stack: error.serviceError.stack,
        },
        context: error.context,
      },
      error,
    )
    // oxlint-disable-next-line typescript/consistent-type-assertions -- statusCodeは任意のnumberを取り得るため、Honoが要求するContentfulStatusCodeへ実行時に絞り込めず型アサーションが避けられないため
    throw new HTTPException(error.statusCode as ContentfulStatusCode, {
      message: error.message,
    })
  }

  if (error instanceof ServerError) {
    logger.error('internal server error', error)
    // oxlint-disable-next-line typescript/consistent-type-assertions -- statusCodeは任意のnumberを取り得るため、Honoが要求するContentfulStatusCodeへ実行時に絞り込めず型アサーションが避けられないため
    throw new HTTPException(error.statusCode as ContentfulStatusCode, {
      message: error.message,
    })
  }

  logger.error('unknown error', error)
  throw new HTTPException(500, {
    message: 'unknown error',
  })
}
