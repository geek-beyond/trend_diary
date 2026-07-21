import { NoSessionError, UnexpectedAuthError } from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { captureThrow } from '@/test/helper/capture-throw'
import throwHttpError from './error'

describe('OAuth 認証エラーの HTTP 写像', () => {
  describe('準正常系', () => {
    it('NoSessionError を HTTPException(401) へ写像しメッセージを引き継ぐこと', () => {
      const error = new NoSessionError('no session')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 401, message: error.message })
    })
  })

  describe('異常系', () => {
    it('写像先を持たないエラーは HTTPException(500) へ写像しメッセージを引き継ぐこと', () => {
      const error = new UnexpectedAuthError('boom')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 500, message: error.message })
    })
  })
})
