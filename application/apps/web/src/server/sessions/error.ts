import { InvalidCredentialsError } from '@trend-diary/authentication'
import throwHttpErrorByTable, { type ErrorStatusTable } from '@/server/error/throw-http-error'

// 認証後の active_user 解決失敗（ActiveUserNotFoundError 等）はサーバ側の不整合なので、
// ここでは写像せず default の 500 へ倒す。account のエラー写像は auth ハンドラから分離する
const ERROR_STATUS_TABLE: ErrorStatusTable = [[InvalidCredentialsError, 401]]

export default function throwHttpError(error: Error): never {
  return throwHttpErrorByTable(error, ERROR_STATUS_TABLE)
}
