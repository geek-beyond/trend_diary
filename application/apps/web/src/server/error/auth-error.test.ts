import {
  type AuthError,
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UnexpectedAuthError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import throwAuthHttpError from './auth-error'

// throwAuthHttpError は never を返して throw するため、投げられた値を捕捉して検証する
// oxlint-disable-next-line typescript/no-restricted-types -- catch は任意の値を受けるため unknown 以外に書けないため
const captureThrow = (fn: () => never): unknown => {
  try {
    fn()
    return undefined
  } catch (e) {
    return e
  }
}

describe('throwAuthHttpError', () => {
  describe('準正常系', () => {
    const cases: Array<{ name: string; error: AuthError; status: number }> = [
      {
        name: 'InvalidCredentialsError',
        error: new InvalidCredentialsError('invalid'),
        status: 401,
      },
      { name: 'UserAlreadyExistsError', error: new UserAlreadyExistsError('exists'), status: 409 },
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
      { name: 'NoSessionError', error: new NoSessionError('no session'), status: 401 },
    ]

    it.each(cases)(
      '$name は対応する HTTPException を投げメッセージを引き継ぐこと',
      ({ error, status }) => {
        const thrown = captureThrow(() => throwAuthHttpError(error))

        expect(thrown).toBeInstanceOf(HTTPException)
        expect(thrown).toMatchObject({ status, message: error.message })
      },
    )
  })

  describe('異常系', () => {
    it('対応表に無い認証エラーは HTTPException に写像せず元のエラーをそのまま投げること', () => {
      const error = new UnexpectedAuthError('boom')

      const thrown = captureThrow(() => throwAuthHttpError(error))

      expect(thrown).toBe(error)
    })
  })
})
