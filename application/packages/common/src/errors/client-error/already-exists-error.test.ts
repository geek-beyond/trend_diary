import { describe, expect, it } from 'vitest'

import AlreadyExistsError from './already-exists-error'
import ClientError from './client-error'

describe('AlreadyExistsError', () => {
  it('409のClientErrorとして振る舞う', () => {
    const error = new AlreadyExistsError('article already exists')

    expect(error).toBeInstanceOf(AlreadyExistsError)
    expect(error).toBeInstanceOf(ClientError)
    expect(error.statusCode).toBe(409)
    expect(error.message).toBe('article already exists')
    expect(error.name).toBe('AlreadyExistsError')
  })
})
