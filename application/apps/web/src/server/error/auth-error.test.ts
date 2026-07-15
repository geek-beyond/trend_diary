import {
  type AuthError,
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UnexpectedAuthError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { ClientError, ServerError } from '@trend-diary/common/errors'
import toAuthError from './auth-error'

describe('toAuthError', () => {
  describe('準正常系', () => {
    const cases: Array<{ name: string; error: AuthError; statusCode: number }> = [
      {
        name: 'InvalidCredentialsError',
        error: new InvalidCredentialsError('invalid'),
        statusCode: 401,
      },
      {
        name: 'UserAlreadyExistsError',
        error: new UserAlreadyExistsError('exists'),
        statusCode: 409,
      },
      {
        name: 'PasskeyRegistrationError',
        error: new PasskeyRegistrationError('register'),
        statusCode: 400,
      },
      {
        name: 'PasskeyVerificationError',
        error: new PasskeyVerificationError('verify'),
        statusCode: 401,
      },
      { name: 'NoSessionError', error: new NoSessionError('no session'), statusCode: 401 },
    ]

    it.each(cases)(
      '$name は対応する ClientError へ写像しメッセージを引き継ぐこと',
      ({ error, statusCode }) => {
        const converted = toAuthError(error)

        expect(converted).toBeInstanceOf(ClientError)
        expect(converted.statusCode).toBe(statusCode)
        expect(converted.message).toBe(error.message)
      },
    )
  })

  describe('異常系', () => {
    it('対応表に無い認証エラーは ServerError(500) へ倒しメッセージを引き継ぐこと', () => {
      const converted = toAuthError(new UnexpectedAuthError('boom'))

      expect(converted).toBeInstanceOf(ServerError)
      expect(converted.statusCode).toBe(500)
      expect(converted.message).toBe('boom')
    })
  })
})
