import { describe, expect, it } from 'vitest'
import { failure, isFailure, isSuccess, success, wrapAsyncCall } from './index'

describe('Result', () => {
  describe('success', () => {
    it('valueを保持したOkを返すこと', () => {
      const result = success(42)
      expect(result.isOk()).toBe(true)
      if (isSuccess(result)) {
        expect(result.value).toBe(42)
      }
    })

    it('nullをvalueとして保持できること', () => {
      const result = success(null)
      if (isSuccess(result)) {
        expect(result.value).toBeNull()
      }
    })

    it('オブジェクトをvalueとして保持できること', () => {
      const value = { id: 1, name: 'test' }
      const result = success(value)
      if (isSuccess(result)) {
        expect(result.value).toEqual(value)
      }
    })
  })

  describe('failure', () => {
    it('errorを保持したErrを返すこと', () => {
      const error = new Error('something went wrong')
      const result = failure(error)
      expect(result.isErr()).toBe(true)
      if (isFailure(result)) {
        expect(result.error).toBe(error)
      }
    })

    it('Error以外のエラー値も保持できること', () => {
      const result = failure('error string')
      if (isFailure(result)) {
        expect(result.error).toBe('error string')
      }
    })
  })

  describe('isSuccess', () => {
    it('successで生成されたResultに対してtrueを返すこと', () => {
      expect(isSuccess(success(1))).toBe(true)
    })

    it('failureで生成されたResultに対してfalseを返すこと', () => {
      expect(isSuccess(failure(new Error('e')))).toBe(false)
    })

    it('型ガードとしてvalueにアクセスできること', () => {
      const result = success('value')
      if (isSuccess(result)) {
        expect(result.value).toBe('value')
      }
    })
  })

  describe('isFailure', () => {
    it('failureで生成されたResultに対してtrueを返すこと', () => {
      expect(isFailure(failure(new Error('e')))).toBe(true)
    })

    it('successで生成されたResultに対してfalseを返すこと', () => {
      expect(isFailure(success(1))).toBe(false)
    })

    it('型ガードとしてerrorにアクセスできること', () => {
      const error = new Error('e')
      const result = failure(error)
      if (isFailure(result)) {
        expect(result.error).toBe(error)
      }
    })
  })

  describe('wrapAsyncCall', () => {
    it('正常終了時はsuccessを返すこと', async () => {
      const result = await wrapAsyncCall(async () => 'ok')
      expect(isSuccess(result)).toBe(true)
      if (isSuccess(result)) {
        expect(result.value).toBe('ok')
      }
    })

    it('Errorが投げられた場合はそのErrorを保持したfailureを返すこと', async () => {
      const error = new Error('boom')
      const result = await wrapAsyncCall(async () => {
        throw error
      })
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error).toBe(error)
      }
    })

    it('Error以外が投げられた場合はErrorにラップしてfailureを返すこと', async () => {
      const result = await wrapAsyncCall(async () => {
        throw 'string error'
      })
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(Error)
        expect(result.error.message).toBe('string error')
      }
    })

    it('同期的に投げられた例外もfailureとして扱うこと', async () => {
      const result = await wrapAsyncCall(() => {
        throw new Error('sync throw')
      })
      expect(isFailure(result)).toBe(true)
      if (isFailure(result)) {
        expect(result.error.message).toBe('sync throw')
      }
    })

    it('cleanupは成功時に呼ばれること', async () => {
      let cleanedUp = false
      const result = await wrapAsyncCall(
        async () => 'ok',
        () => {
          cleanedUp = true
        },
      )
      expect(isSuccess(result)).toBe(true)
      expect(cleanedUp).toBe(true)
    })

    it('cleanupは失敗時にも呼ばれること', async () => {
      let cleanedUp = false
      const result = await wrapAsyncCall(
        async () => {
          throw new Error('boom')
        },
        () => {
          cleanedUp = true
        },
      )
      expect(isFailure(result)).toBe(true)
      expect(cleanedUp).toBe(true)
    })

    it('非同期cleanupの完了を待つこと', async () => {
      let cleanedUp = false
      await wrapAsyncCall(
        async () => 'ok',
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 1))
          cleanedUp = true
        },
      )
      expect(cleanedUp).toBe(true)
    })
  })
})
