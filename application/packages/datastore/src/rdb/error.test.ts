import { describe, expect, it } from 'vitest'
import { wrapDbCall } from './error'

describe('wrapDbCall', () => {
  it('正常終了時はokを返すこと', async () => {
    const result = await wrapDbCall(async () => 42)

    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe(42)
    }
  })

  it('causeにErrorを持つ例外の場合はcauseを取り出してerrを返すこと', async () => {
    const originalDbError = new Error('UNIQUE constraint failed: users.email')
    const wrappedError = new Error('Failed query: insert into users', { cause: originalDbError })

    const result = await wrapDbCall(async () => {
      throw wrappedError
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBe(originalDbError)
    }
  })

  it('causeがErrorでない場合は元のエラーをそのまま返すこと', async () => {
    const error = new Error('plain error')

    const result = await wrapDbCall(async () => {
      throw error
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBe(error)
    }
  })

  it('Error以外が投げられた場合はErrorにラップしてerrを返すこと', async () => {
    const result = await wrapDbCall(async () => {
      throw 'string error'
    })

    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('string error')
    }
  })
})
