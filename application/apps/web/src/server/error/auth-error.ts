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

// 認証パッケージのカスタムエラーは HTTP を知らないため、HTTP への写像はハンドラ層(HTTP 境界)の責務とする。
// どの認証エラーがどのステータスかは境界の対応表として持つ。
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

// 認証ドメインエラーを対応する HTTPException として送出する。
// 対応表に無い認証エラー(想定外)はサーバ起因として errorHandler の 5xx 処理に委ねる。
export default function throwHttpError(error: AuthError): never {
  for (const [ErrorClass, status] of AUTH_ERROR_STATUS) {
    if (error instanceof ErrorClass) {
      throw new HTTPException(status, { message: error.message })
    }
  }
  throw error
}
