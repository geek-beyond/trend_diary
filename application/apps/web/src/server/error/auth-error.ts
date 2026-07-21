import {
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import throwHttpErrorByTable, { type ErrorStatusTable } from './throw-http-error'

const ERROR_STATUS_TABLE: ErrorStatusTable = [
  [InvalidCredentialsError, 401],
  [UserAlreadyExistsError, 409],
  [PasskeyRegistrationError, 400],
  [PasskeyVerificationError, 401],
  [NoSessionError, 401],
]

// 認証集約のドメインエラーを HTTPException へ写像して送出する。
export default function throwHttpError(error: Error): never {
  return throwHttpErrorByTable(error, ERROR_STATUS_TABLE)
}
