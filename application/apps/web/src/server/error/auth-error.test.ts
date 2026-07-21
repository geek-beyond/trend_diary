import {
  type AuthError,
  InvalidCredentialsError,
  NoSessionError,
  UnexpectedAuthError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { captureThrow } from '@/test/helper/capture-throw'
import throwHttpError from './auth-error'

describe('認証集約のエラーの HTTP 写像', () => {
  describe('準正常系', () => {
    const cases: Array<{ name: string; error: AuthError; status: number }> = [
      {
        name: 'InvalidCredentialsError',
        error: new InvalidCredentialsError('invalid'),
        status: 401,
      },
      { name: 'UserAlreadyExistsError', error: new UserAlreadyExistsError('exists'), status: 409 },
      { name: 'NoSessionError', error: new NoSessionError('no session'), status: 401 },
    ]

    it.each(cases)(
      '$name を HTTPException($status) へ写像しメッセージを引き継ぐこと',
      ({ error, status }) => {
        const thrown = captureThrow(() => throwHttpError(error))

        expect(thrown).toBeInstanceOf(HTTPException)
        expect(thrown).toMatchObject({ status, message: error.message })
      },
    )
  })

  describe('異常系', () => {
    it('対応表に無いエラーは写像せず元のエラーをそのまま投げること', () => {
      const error = new UnexpectedAuthError('boom')

      const thrown = captureThrow(() => throwHttpError(error))

      expect(thrown).toBe(error)
    })
  })
})
