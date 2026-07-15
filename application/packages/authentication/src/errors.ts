import { AlreadyExistsError, ClientError, ServerError } from '@trend-diary/common/errors'

// 認証パッケージが返すカスタムエラー。共通のドメインエラーを継承し HTTP ステータスを内包するため、
// handleError(共通)がそのまま instanceof で解釈できる。呼び出し側で個別に写像する必要は無い。
export class InvalidCredentialsError extends ClientError {
  constructor(message: string) {
    super(message, 401)
    this.name = 'InvalidCredentialsError'
  }
}

export class UserAlreadyExistsError extends AlreadyExistsError {
  constructor(message: string) {
    super(message)
    this.name = 'UserAlreadyExistsError'
  }
}

export class PasskeyRegistrationError extends ClientError {
  constructor(message: string) {
    super(message, 400)
    this.name = 'PasskeyRegistrationError'
  }
}

export class PasskeyVerificationError extends ClientError {
  constructor(message: string) {
    super(message, 401)
    this.name = 'PasskeyVerificationError'
  }
}

export class NoSessionError extends ClientError {
  constructor(message: string) {
    super(message, 401)
    this.name = 'NoSessionError'
  }
}

// 例外や想定外の失敗(通信断・空データ等)を表す。
export class UnexpectedAuthError extends ServerError {
  constructor(message: string) {
    super(message)
    this.name = 'UnexpectedAuthError'
  }
}

export type AuthError =
  | InvalidCredentialsError
  | UserAlreadyExistsError
  | PasskeyRegistrationError
  | PasskeyVerificationError
  | NoSessionError
  | UnexpectedAuthError
