import {
  InvalidCredentialsError,
  NoSessionError,
  PasskeyRegistrationError,
  PasskeyVerificationError,
  UserAlreadyExistsError,
} from '@trend-diary/authentication'
import { ActiveUserNotFoundError } from '@trend-diary/domain/account'
import { ArticleNotFoundError } from '@trend-diary/domain/article'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

type ErrorStatusTable = ReadonlyArray<
  readonly [abstract new (...args: never[]) => Error, ContentfulStatusCode]
>

// 集約ごとのドメインエラー → HTTP ステータス対応表。HTTP への写像は境界(ハンドラ)の責務のため、境界に置く。
export const AUTH_ERROR_STATUS: ErrorStatusTable = [
  [InvalidCredentialsError, 401],
  [UserAlreadyExistsError, 409],
  [PasskeyRegistrationError, 400],
  [PasskeyVerificationError, 401],
  [NoSessionError, 401],
]

export const ARTICLE_ERROR_STATUS: ErrorStatusTable = [[ArticleNotFoundError, 404]]

export const ACCOUNT_ERROR_STATUS: ErrorStatusTable = [[ActiveUserNotFoundError, 404]]

// 一致するドメインエラーだけ HTTPException へ写像する。対応表に無いエラー(想定外)は握りつぶさず素通しで
// 再送出し、サーバ起因として errorHandler の 5xx 処理・通知へ委ねる。
export default function throwHttpError(error: Error, statusTable: ErrorStatusTable): never {
  for (const [ErrorClass, status] of statusTable) {
    if (error instanceof ErrorClass) {
      throw new HTTPException(status, { message: error.message })
    }
  }
  throw error
}
