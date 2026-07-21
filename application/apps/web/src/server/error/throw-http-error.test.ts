import {
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UnexpectedAuthError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { ActiveUserNotFoundError } from '@trend-diary/domain/account'
import { ArticleNotFoundError } from '@trend-diary/domain/article'
import { HTTPException } from 'hono/http-exception'
import { describe, expect, it } from 'vitest'
import { captureThrow } from '@/test/helper/capture-throw'
import { ACCOUNT_ERROR_STATUS_TABLE } from './account-error-status'
import { ARTICLE_ERROR_STATUS_TABLE } from './article-error-status'
import { AUTH_ERROR_STATUS_TABLE } from './auth-error-status'
import throwHttpError from './throw-http-error'

describe('throwHttpError', () => {
  describe('準正常系', () => {
    it.each([
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
    ])(
      'AUTH_ERROR_STATUS_TABLE で $name を HTTPException($status) へ写像すること',
      ({ error, status }) => {
        const thrown = captureThrow(() => throwHttpError(error, AUTH_ERROR_STATUS_TABLE))

        expect(thrown).toBeInstanceOf(HTTPException)
        expect(thrown).toMatchObject({ status, message: error.message })
      },
    )

    it.each([
      {
        name: 'ArticleNotFoundError',
        table: ARTICLE_ERROR_STATUS_TABLE,
        error: new ArticleNotFoundError('article not found'),
      },
      {
        name: 'ActiveUserNotFoundError',
        table: ACCOUNT_ERROR_STATUS_TABLE,
        error: new ActiveUserNotFoundError('user not found'),
      },
    ])('$name を HTTPException(404) へ写像しメッセージを引き継ぐこと', ({ table, error }) => {
      const thrown = captureThrow(() => throwHttpError(error, table))

      expect(thrown).toBeInstanceOf(HTTPException)
      expect(thrown).toMatchObject({ status: 404, message: error.message })
    })
  })

  describe('異常系', () => {
    it('対応表に無いエラーは HTTPException に写像せず元のエラーをそのまま投げること', () => {
      const error = new UnexpectedAuthError('boom')

      const thrown = captureThrow(() => throwHttpError(error, AUTH_ERROR_STATUS_TABLE))

      expect(thrown).toBe(error)
    })
  })
})
