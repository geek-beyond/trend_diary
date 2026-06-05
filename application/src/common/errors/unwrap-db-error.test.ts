import { describe, expect, it } from 'vitest'

import unwrapDbError from './unwrap-db-error'

describe('unwrapDbError', () => {
  it('causeがErrorの場合は適切な例外を取り出す', () => {
    const driverError = new Error('UNIQUE constraint failed')
    const wrapped = new Error('Failed query: insert into ...')
    wrapped.cause = driverError

    const result = unwrapDbError(wrapped)

    expect(result).toBe(driverError)
    expect(result.message).toBe('UNIQUE constraint failed')
  })

  it('causeがない場合は適切な例外を取り出す', () => {
    const error = new Error('plain error')

    const result = unwrapDbError(error)

    expect(result).toBe(error)
    expect(result.message).toBe('plain error')
  })

  it('causeが文字列の場合は適切な例外を取り出す', () => {
    const error = new Error('outer error')
    error.cause = 'string cause'

    const result = unwrapDbError(error)

    expect(result).toBe(error)
    expect(result.message).toBe('outer error')
  })
})
