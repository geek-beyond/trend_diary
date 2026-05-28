import { describe, expect, it } from 'vitest'
import { wrapAsyncCall } from './index'

describe('wrapAsyncCall', () => {
  it('正常終了時はokを返すこと', async () => {
    const result = await wrapAsyncCall(async () => 'ok')
    expect(result.isOk()).toBe(true)
    if (result.isOk()) {
      expect(result.value).toBe('ok')
    }
  })

  it('Errorが投げられた場合はそのErrorを保持したerrを返すこと', async () => {
    const error = new Error('boom')
    const result = await wrapAsyncCall(async () => {
      throw error
    })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBe(error)
    }
  })

  it('Error以外が投げられた場合はErrorにラップしてerrを返すこと', async () => {
    const result = await wrapAsyncCall(async () => {
      throw 'string error'
    })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toBe('string error')
    }
  })

  it('同期的に投げられた例外もerrとして扱うこと', async () => {
    const result = await wrapAsyncCall(() => {
      throw new Error('sync throw')
    })
    expect(result.isErr()).toBe(true)
    if (result.isErr()) {
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
    expect(result.isOk()).toBe(true)
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
    expect(result.isErr()).toBe(true)
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
