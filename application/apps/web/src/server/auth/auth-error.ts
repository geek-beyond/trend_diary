import {
  type AuthError,
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// 認証パッケージのカスタムエラーは HTTP を知らないため、ステータスへの写像は HTTP 境界であるハンドラ層の責務とする。
// メッセージは元のエラーをそのまま引き継ぎ、対応表に無いものはサーバ起因として 500 に倒す。
const AUTH_ERROR_STATUS = new Map<
  abstract new (...args: never[]) => AuthError,
  ContentfulStatusCode
>([
  [InvalidCredentialsError, 401],
  [UserAlreadyExistsError, 409],
  [PasskeyRegistrationError, 400],
  [PasskeyVerificationError, 401],
  [NoSessionError, 401],
])

export default function toHttpException(error: AuthError): HTTPException {
  for (const [ErrorClass, status] of AUTH_ERROR_STATUS) {
    if (error instanceof ErrorClass) return new HTTPException(status, { message: error.message })
  }
  return new HTTPException(500, { message: error.message })
}
