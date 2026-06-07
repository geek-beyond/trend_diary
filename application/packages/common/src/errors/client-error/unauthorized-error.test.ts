import { describe, expect, it } from 'vitest'

import ClientError from './client-error'
import UnauthorizedError from './unauthorized-error'

describe('UnauthorizedError', () => {
  it('401のClientErrorとして振る舞う', () => {
    const error = new UnauthorizedError('session expired')

    expect(error).toBeInstanceOf(UnauthorizedError)
    expect(error).toBeInstanceOf(ClientError)
    expect(error.statusCode).toBe(401)
    expect(error.message).toBe('session expired')
    expect(error.name).toBe('UnauthorizedError')
    expect(error.context).toBeUndefined()
  })

  it('contextを引数のまま保持する', () => {
    const context = { userId: 123, sessionExists: false }

    const error = new UnauthorizedError('session expired', context)

    expect(error.context).toBe(context)
  })
})
