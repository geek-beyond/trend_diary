import { describe, expect, it } from 'vitest'

import ClientError from './client-error'
import NotFoundError from './not-found-error'

describe('NotFoundError', () => {
  it('404のClientErrorとして振る舞う', () => {
    const error = new NotFoundError('article not found')

    expect(error).toBeInstanceOf(NotFoundError)
    expect(error).toBeInstanceOf(ClientError)
    expect(error.statusCode).toBe(404)
    expect(error.message).toBe('article not found')
    expect(error.name).toBe('NotFoundError')
  })
})
