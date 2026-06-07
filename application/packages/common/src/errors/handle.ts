import { HTTPException } from 'hono/http-exception'
import { ContentfulStatusCode } from 'hono/utils/http-status'
import { LoggerType } from '../logger'
import ClientError from './client-error/client-error'
import ExternalServiceError from './external-service-error'
import ServerError from './server-error'

export default function handleError(error: unknown, logger: LoggerType): HTTPException {
  if (error instanceof ClientError) {
    logger.warn('client error', error)
    return new HTTPException(error.statusCode as ContentfulStatusCode, {
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
    return new HTTPException(error.statusCode as ContentfulStatusCode, {
      message: error.message,
    })
  }

  if (error instanceof ServerError) {
    logger.error('internal server error', error)
    return new HTTPException(error.statusCode as ContentfulStatusCode, {
      message: error.message,
    })
  }

  logger.error('unknown error', error)
  return new HTTPException(500, {
    message: 'unknown error',
  })
}
