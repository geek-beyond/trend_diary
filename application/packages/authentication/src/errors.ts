export type AuthErrorReason =
  | 'invalid_credentials'
  | 'user_already_exists'
  | 'registration_failed'
  | 'passkey_registration_failed'
  | 'passkey_verification_failed'
  | 'no_session'
  | 'unexpected'

// 認証パッケージ独自のエラー。HTTPステータス等への写像は行わず、失敗の種別(reason)だけを表す。
// ステータスやドメインエラーへの変換は呼び出し側(ハンドラ)の責務とする。
export class AuthenticationError extends Error {
  readonly reason: AuthErrorReason

  constructor(reason: AuthErrorReason, message: string, options?: { cause?: Error }) {
    super(message, options)
    this.reason = reason
    this.name = 'AuthenticationError'
  }
}
