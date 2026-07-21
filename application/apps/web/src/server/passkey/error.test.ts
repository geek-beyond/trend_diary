import {
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UnexpectedAuthError,
} from '@trend-diary/authentication'
import { ActiveUserNotFoundError } from '@trend-diary/domain/account'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { captureThrow } from '@/test/helper/capture-throw'
import throwHttpError from './error'

describe('パスキー系ハンドラのエラーの HTTP 写像', () => {
  describe('準正常系', () => {
    it.each([
      {
        name: 'PasskeyRegistrationError',
        error: new PasskeyRegistrationError('register'),
        status: 400,
      },
      {
        name: 'PasskeyVerificationError',
        error: new PasskeyVerificationError('verify'),
        status: 401,
      },
    ])('$name を HTTPException($status) へ写像しメッセージを引き継ぐこと', ({ error, status }) => {
      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status, message: error.message })
    })
  })

  describe('異常系', () => {
    it.each([
      {
        // 認証後の active_user 解決失敗はサーバ側の不整合なので 404 ではなく 500 に倒す
        name: 'ActiveUserNotFoundError',
        error: new ActiveUserNotFoundError('user not found'),
      },
      {
        name: 'UnexpectedAuthError',
        error: new UnexpectedAuthError('boom'),
      },
    ])(
      '$name は写像先を持たず HTTPException(500) へ写像しメッセージを引き継ぐこと',
      ({ error }) => {
        const thrown = captureThrow(() => throwHttpError(error))

        expect(thrown).toBeInstanceOf(HTTPException)
        expect(thrown).toMatchObject({ status: 500, message: error.message })
      },
    )
  })
})
