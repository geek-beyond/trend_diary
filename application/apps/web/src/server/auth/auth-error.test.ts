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
import toHttpException from './auth-error'

describe('toHttpException', () => {
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
      '$name は対応するステータスへ写像しメッセージを引き継ぐこと',
      ({ error, status }) => {
        const exception = toHttpException(error)

        expect(exception).toBeInstanceOf(HTTPException)
        expect(exception.status).toBe(status)
        expect(exception.message).toBe(error.message)
      },
    )
  })

  describe('異常系', () => {
    it('対応表に無い認証エラーは500へ倒しメッセージを引き継ぐこと', () => {
      const error = new UnexpectedAuthError('boom')
      const exception = toHttpException(error)

      expect(exception.status).toBe(500)
      expect(exception.message).toBe('boom')
    })
  })
})
