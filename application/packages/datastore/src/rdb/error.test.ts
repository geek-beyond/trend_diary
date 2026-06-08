import { describe, expect, it } from 'vitest'
import { wrapDbCall } from './error'

describe('wrapDbCall', () => {
  describe('正常系', () => {
    it('処理が成功した場合は戻り値を持つokを返す', async () => {
      const result = await wrapDbCall(async () => 42)

      expect(result.isOk()).toBe(true)
      if (result.isOk()) {
        expect(result.value).toBe(42)
      }
    })
  })

  describe('異常系', () => {
    it('causeにErrorを持つ例外の場合はcauseを取り出したerrを返す', async () => {
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

    it('causeがErrorでない例外の場合は元のエラーをそのまま持つerrを返す', async () => {
      const error = new Error('plain error')

      const result = await wrapDbCall(async () => {
        throw error
      })

      expect(result.isErr()).toBe(true)
      if (result.isErr()) {
        expect(result.error).toBe(error)
      }
    })

    it('Error以外が投げられた場合はErrorにラップしたerrを返す', async () => {
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
})
