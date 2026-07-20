import Logger from '@trend-diary/logger'
import { ClientError, ExternalServiceError, ServerError } from '@trend-diary/std/errors'
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

// handleError は never を返して throw するため、投げられた値を捕捉して検証する
// oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
const captureThrow = (fn: () => never): unknown => {
  try {
    fn()
    return undefined
  } catch (e) {
    return e
  }
}

describe('handleError', () => {
  it('ClientErrorをHTTPExceptionに変換して投げつつwarnログを出す', () => {
    const { logger, warn, error: errorSpy } = createLoggerWithSpies()
    const error = new ClientError('invalid query', 422)

    const thrown = captureThrow(() => handleError(error, logger))

    expect(thrown).toBeInstanceOf(HTTPException)
    // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
    const httpException = thrown as HTTPException
    expect(httpException.status).toBe(422)
    expect(httpException.message).toBe('invalid query')
    expect(warn).toHaveBeenCalledTimes(1)
    expect(warn).toHaveBeenCalledWith('client error', error)
    expect(errorSpy).not.toHaveBeenCalled()
  })

  it('ServerErrorをHTTPExceptionに変換して投げつつerrorログを出す', () => {
    const { logger, warn, error: errorSpy } = createLoggerWithSpies()
    const error = new ServerError(new Error('db down'), 503)

    const thrown = captureThrow(() => handleError(error, logger))

    expect(thrown).toBeInstanceOf(HTTPException)
    // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
    const httpException = thrown as HTTPException
    expect(httpException.status).toBe(503)
    expect(httpException.message).toBe('db down')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith('internal server error', error)
    expect(warn).not.toHaveBeenCalled()
  })

  it('ExternalServiceErrorをHTTPExceptionに変換して投げつつ詳細情報を含むerrorログを出す', () => {
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

    const thrown = captureThrow(() => handleError(error, logger))

    expect(thrown).toBeInstanceOf(HTTPException)
    // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
    const httpException = thrown as HTTPException
    expect(httpException.status).toBe(500)
    expect(httpException.message).toBe('Failed to delete Supabase Auth user during compensation')
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

  it('未知のエラーはHTTPException(500)として投げつつerrorログを出す', () => {
    const { logger, warn, error: errorSpy } = createLoggerWithSpies()
    const error = new Error('boom')

    const thrown = captureThrow(() => handleError(error, logger))

    expect(thrown).toBeInstanceOf(HTTPException)
    // oxlint-disable-next-line typescript/consistent-type-assertions -- instanceof で確認済みのため
    const httpException = thrown as HTTPException
    expect(httpException.status).toBe(500)
    expect(httpException.message).toBe('unknown error')
    expect(errorSpy).toHaveBeenCalledTimes(1)
    expect(errorSpy).toHaveBeenCalledWith('unknown error', error)
    expect(warn).not.toHaveBeenCalled()
  })
})
