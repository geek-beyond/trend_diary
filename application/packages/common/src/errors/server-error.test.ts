import { describe, expect, it } from 'vitest'

import ServerError from './server-error'

describe('ServerError', () => {
  it('Errorインスタンスのメッセージを引き継ぎつつ500になる', () => {
    const source = new Error('database unreachable')

    const error = new ServerError(source)

    expect(error).toBeInstanceOf(ServerError)
    expect(error.message).toBe('database unreachable')
    expect(error.statusCode).toBe(500)
    expect(error.name).toBe('ServerError')
  })

  it('指定したstatusCodeを保持する', () => {
    const error = new ServerError(new Error('gateway timeout'), 504)

    expect(error.statusCode).toBe(504)
  })

  it('文字列入力でもmessageに設定される', () => {
    const error = new ServerError('unexpected input', 400)

    expect(error.message).toBe('unexpected input')
    expect(error.statusCode).toBe(400)
  })
})
