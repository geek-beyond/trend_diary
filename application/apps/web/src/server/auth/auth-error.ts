import {
  type AuthError,
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { AlreadyExistsError, ClientError, ServerError } from '@trend-diary/common/errors'

// 認証パッケージのカスタムエラーは HTTP を知らないため、common エラーへの変換はハンドラ層の責務とする。
// メッセージは元のエラーをそのまま引き継ぎ、対応表に無いものはサーバ起因として ServerError に倒す。
const AUTH_ERROR_FACTORY = new Map<
  abstract new (...args: never[]) => AuthError,
  (message: string) => ClientError
>([
  [InvalidCredentialsError, (message) => new ClientError(message, 401)],
  [UserAlreadyExistsError, (message) => new AlreadyExistsError(message)],
  [PasskeyRegistrationError, (message) => new ClientError(message, 400)],
  [PasskeyVerificationError, (message) => new ClientError(message, 401)],
  [NoSessionError, (message) => new ClientError(message, 401)],
])

export default function toAuthError(error: AuthError): ClientError | ServerError {
  for (const [ErrorClass, toClientError] of AUTH_ERROR_FACTORY) {
    if (error instanceof ErrorClass) return toClientError(error.message)
  }
  return new ServerError(error.message)
}
