import { describe, expect, it } from 'vitest'

import ExternalServiceError from './external-service-error'
import ServerError from './server-error'

describe('ExternalServiceError', () => {
  it('指定した情報を保持しServerErrorとして扱える', () => {
    const originalError = new ServerError(new Error('origin failed'))
    const serviceError = new ServerError(new Error('service unavailable'), 503)
    const context = { operation: 'syncUser', requestId: 'req-123' }

    const error = new ExternalServiceError(
      'failed to synchronize user',
      originalError,
      serviceError,
      context,
    )

    expect(error).toBeInstanceOf(ExternalServiceError)
    expect(error).toBeInstanceOf(ServerError)
    expect(error.message).toBe('failed to synchronize user')
    expect(error.name).toBe('ExternalServiceError')
    expect(error.originalError).toBe(originalError)
    expect(error.serviceError).toBe(serviceError)
    expect(error.context).toBe(context)
  })

  it('contextを省略した場合は空のオブジェクトを保持する', () => {
    const error = new ExternalServiceError(
      'failed to synchronize user',
      new ServerError(new Error('origin failed')),
      new ServerError(new Error('service unavailable'), 503),
    )

    expect(error.context).toEqual({})
  })
})
