import {
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import type { ErrorStatusTable } from './throw-http-error'

// 認証集約のドメインエラー → HTTP ステータス対応表。
export const AUTH_ERROR_STATUS_TABLE: ErrorStatusTable = [
  [InvalidCredentialsError, 401],
  [UserAlreadyExistsError, 409],
  [PasskeyRegistrationError, 400],
  [PasskeyVerificationError, 401],
  [NoSessionError, 401],
]
