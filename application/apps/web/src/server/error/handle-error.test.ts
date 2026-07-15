import { ClientError, ExternalServiceError, ServerError } from '@trend-diary/common/errors'
import Logger from '@trend-diary/common/logger'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it, vi } from 'vitest'
import { handleError } from './handle-error'

// 実際のLoggerインスタンスのメソッドをスパイすることで、型のバイパス（二重アサーション）を避ける
const createLoggerWithSpies = () => {
  const logger = new Logger('silent')
  return {
    logger,
    warn: vi.spyOn(logger, 'warn').mockImplementation(() => {}),
    error: vi.spyOn(logger, 'error').mockImplementation(() => {}),
  }
}

describe('handleError', () => {
  it('ClientErrorをHTTPExceptionに変換してwarnログを出す', () => {
    const { logger, warn, error: errorSpy } = createLoggerWithSpies()
    const error = new ClientError('invalid query', 422)

    const result = handleError(error, logger)

    expect(result).toBeInstanceOf(HTTPException)
    expect(result.status).toBe(422)
    expect(result.message).toBe('invalid query')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('client error', error)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('ServerErrorをHTTPExceptionに変換してerrorログを出す', () => {
    const { logger, warn, error: errorSpy } = createLoggerWithSpies()
    const error = new ServerError(new Error('db down'), 503)

    const result = handleError(error, logger)

    expect(result).toBeInstanceOf(HTTPException)
    expect(result.status).toBe(503)
    expect(result.message).toBe('db down')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith('internal server error', error)
    expect(warn).not.toHaveBeenCalled()
  })

  it('ExternalServiceErrorをHTTPExceptionに変換して詳細情報を含むerrorログを出す', () => {
    const { logger, warn, error: errorSpy } = createLoggerWithSpies()
    const originalError = new ServerError('ActiveUser creation failed')
    const serviceError = new ServerError('Supabase Auth deletion failed')
    const context = { userId: 'auth-user-123' }
    const error = new ExternalServiceError(
      'Failed to delete Supabase Auth user during compensation',
      originalError,
      serviceError,
      context,
    )

    const result = handleError(error, logger)

    expect(result).toBeInstanceOf(HTTPException)
    expect(result.status).toBe(500)
    expect(result.message).toBe('Failed to delete Supabase Auth user during compensation')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith(
      {
        msg: 'external service error',
        originalError: {
          message: originalError.message,
          stack: originalError.stack,
        },
        serviceError: {
          message: serviceError.message,
          stack: serviceError.stack,
        },
        context,
      },
      error,
    )
    expect(warn).not.toHaveBeenCalled()
  })

  it('未知のエラーはHTTPException(500)としてerrorログを出す', () => {
    const { logger, warn, error: errorSpy } = createLoggerWithSpies()
    const error = new Error('boom')

    const result = handleError(error, logger)

    expect(result).toBeInstanceOf(HTTPException)
    expect(result.status).toBe(500)
    expect(result.message).toBe('unknown error')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith('unknown error', error)
    expect(warn).not.toHaveBeenCalled()
  })
})
