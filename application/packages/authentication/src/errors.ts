// 認証パッケージが返すカスタムエラー。HTTP ステータス等の責務は持たず、失敗の種別を型で表す。
// HTTP への写像は HTTP 境界(web の errorHandler)の責務とする。
// 各メソッドの Result は実際に返す具象型で表すため、基底型はパッケージ内の共通土台に留め index.ts からは公開しない。
export abstract class AuthError extends Error {}

export class InvalidCredentialsError extends AuthError {
  name = 'InvalidCredentialsError'
}

export class UserAlreadyExistsError extends AuthError {
  name = 'UserAlreadyExistsError'
}

export class PasskeyRegistrationError extends AuthError {
  name = 'PasskeyRegistrationError'
}

export class PasskeyVerificationError extends AuthError {
  name = 'PasskeyVerificationError'
}

export class NoSessionError extends AuthError {
  name = 'NoSessionError'
}

// 例外や想定外の失敗(通信断・空データ等)を表す。
export class UnexpectedAuthError extends AuthError {
  name = 'UnexpectedAuthError'
}
