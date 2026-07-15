import {
  type AuthenticationError,
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// 認証パッケージのカスタムエラー → HTTPステータスの対応表。メッセージは元のエラーをそのまま引き継ぐ。
// マップに無いもの(UnexpectedAuthError 等)は 500 に倒す。
const STATUS_MAP = new Map<
  abstract new (...args: never[]) => AuthenticationError,
  ContentfulStatusCode
>([
  [InvalidCredentialsError, 401],
  [UserAlreadyExistsError, 409],
  [PasskeyRegistrationError, 400],
  [PasskeyVerificationError, 401],
  [NoSessionError, 401],
])

// 認証パッケージのカスタムエラーはHTTPを知らないため、HTTPExceptionへの写像はエラーハンドラ(ミドルウェア)に集約する
export default function toAuthError(error: AuthenticationError): HTTPException {
  for (const [ErrorClass, status] of STATUS_MAP) {
    if (error instanceof ErrorClass) return new HTTPException(status, { message: error.message })
  }
  return new HTTPException(500, { message: error.message })
}
