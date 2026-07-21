import { ActiveUserNotFoundError } from '@trend-diary/domain/account'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { captureThrow } from '@/test/helper/capture-throw'
import throwHttpError from './account-error'

describe('アカウント集約のエラーの HTTP 写像', () => {
  describe('準正常系', () => {
    it('ActiveUserNotFoundError を HTTPException(404) へ写像しメッセージを引き継ぐこと', () => {
      const error = new ActiveUserNotFoundError('user not found')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 404, message: error.message })
    })
  })
})
