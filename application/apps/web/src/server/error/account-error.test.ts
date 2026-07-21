import { ActiveUserNotFoundError } from '@trend-diary/domain/account'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import throwHttpError from './account-error'

// throwHttpError は never を返して throw するため、投げられた値を捕捉して検証する
// oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
const captureThrow = (fn: () => never): unknown => {
  try {
    fn()
    return undefined
  } catch (e) {
    return e
  }
}

describe('throwHttpError', () => {
  describe('準正常系', () => {
    it('ActiveUserNotFoundError は HTTPException(404) を投げメッセージを引き継ぐこと', () => {
      const error = new ActiveUserNotFoundError('User not found')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 404, message: error.message })
    })
  })

  describe('異常系', () => {
    it('対応表に無いエラーは HTTPException に写像せず元のエラーをそのまま投げること', () => {
      const error = new Error('db down')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBe(error)
    })
  })
})
