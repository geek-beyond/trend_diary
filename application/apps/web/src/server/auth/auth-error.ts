import type { AuthenticationError } from '@trend-diary/authentication'
import { AlreadyExistsError, ClientError, ServerError } from '@trend-diary/common/errors'

// 認証パッケージのエラーはHTTPを知らないため、ステータスへの写像はハンドラ層の責務として一箇所に集約する
export default function toAuthError(error: AuthenticationError): Error {
  switch (error.reason) {
    case 'invalid_credentials':
      return new ClientError('Invalid email or password', 401)
    case 'user_already_exists':
      return new AlreadyExistsError('User already exists')
    case 'passkey_registration_failed':
      return new ClientError('Passkey registration failed', 400)
    case 'passkey_verification_failed':
      return new ClientError('Invalid passkey', 401)
    case 'no_session':
      return new ClientError('No session found', 401)
    default:
      return new ServerError(error.message)
  }
}
