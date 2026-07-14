// 認証パッケージが返すカスタムエラー。HTTPステータスやドメインエラーへの写像は行わず、
// 失敗の種別を型そのもので表す。変換は呼び出し側(ハンドラ)の責務とする。
export abstract class AuthenticationError extends Error {}

export class InvalidCredentialsError extends AuthenticationError {
  name = 'InvalidCredentialsError'
}

export class UserAlreadyExistsError extends AuthenticationError {
  name = 'UserAlreadyExistsError'
}

export class PasskeyRegistrationError extends AuthenticationError {
  name = 'PasskeyRegistrationError'
}

export class PasskeyVerificationError extends AuthenticationError {
  name = 'PasskeyVerificationError'
}

export class NoSessionError extends AuthenticationError {
  name = 'NoSessionError'
}

// 例外や想定外の失敗(通信断・空データ等)を表す。
export class UnexpectedAuthError extends AuthenticationError {
  name = 'UnexpectedAuthError'
}
