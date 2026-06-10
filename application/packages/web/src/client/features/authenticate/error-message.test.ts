import { ClientError, ServerError } from '@trend-diary/common/errors'
import { ApiError } from '@/client/lib/error'
import {
  AUTH_ERROR_MESSAGES,
  resolveLoginErrorMessage,
  resolveSignupErrorMessage,
} from './error-message'

describe('authenticate error-message', () => {
  describe('resolveLoginErrorMessage', () => {
    it('statusCode=401は認証失敗メッセージになる', () => {
      const error = new ClientError('unauthorized', 401)
      expect(resolveLoginErrorMessage(error)).toBe(
        'メールアドレスまたはパスワードが正しくありません',
      )
    })

    it('statusCode=500はサーバーエラーメッセージになる', () => {
      const error = new ServerError('internal server error', 500)
      expect(resolveLoginErrorMessage(error)).toBe(
        'サーバーエラーが発生しました。時間をおいて再度お試しください。',
      )
    })

    it('ApiErrorのstatusCodeを解釈できる', () => {
      expect(resolveLoginErrorMessage(new ApiError(404, 'Not Found'))).toBe(
        'メールアドレスまたはパスワードが正しくありません',
      )
    })

    it('不明なエラーは汎用メッセージになる', () => {
      expect(resolveLoginErrorMessage(new Error('unexpected'))).toBe(AUTH_ERROR_MESSAGES.unexpected)
    })
  })

  describe('resolveSignupErrorMessage', () => {
    it('statusCode=409は重複メッセージになる', () => {
      const error = new ClientError('already exists', 409)
      expect(resolveSignupErrorMessage(error)).toBe('このメールアドレスは既に使用されています')
    })

    it('statusCode=500はサーバーエラーメッセージになる', () => {
      const error = new ServerError('internal server error', 500)
      expect(resolveSignupErrorMessage(error)).toBe(
        'サーバーエラーが発生しました。時間をおいて再度お試しください。',
      )
    })

    it('ApiErrorのstatusCodeを解釈できる', () => {
      expect(resolveSignupErrorMessage(new ApiError(409, 'Conflict'))).toBe(
        'このメールアドレスは既に使用されています',
      )
    })

    it('不明なエラーは汎用メッセージになる', () => {
      expect(resolveSignupErrorMessage(new Error('unexpected'))).toBe(
        AUTH_ERROR_MESSAGES.unexpected,
      )
    })
  })
})
