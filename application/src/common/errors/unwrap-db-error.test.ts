import { describe, expect, it } from 'vitest'

import unwrapDbError from './unwrap-db-error'

describe('unwrapDbError', () => {
  it.each([
    {
      name: 'causeがError',
      build: () => {
        const driverError = new Error('UNIQUE constraint failed')
        const wrapped = new Error('Failed query: insert into ...')
        wrapped.cause = driverError
        return {
          input: wrapped,
          expected: driverError,
          expectedMessage: 'UNIQUE constraint failed',
        }
      },
    },
    {
      name: 'causeがない',
      build: () => {
        const error = new Error('plain error')
        return { input: error, expected: error, expectedMessage: 'plain error' }
      },
    },
    {
      name: 'causeが文字列',
      build: () => {
        const error = new Error('outer error')
        error.cause = 'string cause'
        return { input: error, expected: error, expectedMessage: 'outer error' }
      },
    },
  ])('$nameの場合は適切な例外を取り出す', ({ build }) => {
    const { input, expected, expectedMessage } = build()

    const result = unwrapDbError(input)

    expect(result).toBe(expected)
    expect(result.message).toBe(expectedMessage)
  })
})
