import {
  type AuthenticationError,
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { AlreadyExistsError, ClientError, ServerError } from '@trend-diary/common/errors'

// 認証パッケージのカスタムエラーはHTTPを知らないため、ステータスへの写像はハンドラ層の責務として一箇所に集約する
export default function toAuthError(error: AuthenticationError): Error {
  if (error instanceof InvalidCredentialsError) {
    return new ClientError('Invalid email or password', 401)
  }
  if (error instanceof UserAlreadyExistsError) {
    return new AlreadyExistsError('User already exists')
  }
  if (error instanceof PasskeyRegistrationError) {
    return new ClientError('Passkey registration failed', 400)
  }
  if (error instanceof PasskeyVerificationError) {
    return new ClientError('Invalid passkey', 401)
  }
  if (error instanceof NoSessionError) {
    return new ClientError('No session found', 401)
  }
  return new ServerError(error.message)
}
