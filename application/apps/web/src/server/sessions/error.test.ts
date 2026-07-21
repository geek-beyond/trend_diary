import { InvalidCredentialsError, UnexpectedAuthError } from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { captureThrow } from '@/test/helper/capture-throw'
import throwHttpError from './error'

describe('ログイン系ハンドラのエラーの HTTP 写像', () => {
  describe('準正常系', () => {
    it('InvalidCredentialsError を HTTPException(401) へ写像しメッセージを引き継ぐこと', () => {
      const error = new InvalidCredentialsError('invalid')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 401, message: error.message })
    })
  })

  describe('異常系', () => {
    // 認証後の active_user 解決失敗（未写像の account エラー）を含め、写像先を持たないエラーは 500 に倒す
    it('写像先を持たないエラーは HTTPException(500) へ写像しメッセージを引き継ぐこと', () => {
      const error = new UnexpectedAuthError('boom')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 500, message: error.message })
    })
  })
})
