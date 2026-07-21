import { UnexpectedAuthError, UserAlreadyExistsError } from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { captureThrow } from '@/test/helper/capture-throw'
import throwHttpError from './error'

describe('サインアップ認証エラーの HTTP 写像', () => {
  describe('準正常系', () => {
    it('UserAlreadyExistsError を HTTPException(409) へ写像しメッセージを引き継ぐこと', () => {
      const error = new UserAlreadyExistsError('exists')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 409, message: error.message })
    })
  })

  describe('異常系', () => {
    it('写像先を持たないエラーは元のエラーをそのまま投げること', () => {
      const error = new UnexpectedAuthError('boom')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBe(error)
    })
  })
})
