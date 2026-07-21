import { ActiveUserNotFoundError } from '@trend-diary/domain/account'
import { HTTPException } from 'hono/http-exception'

// アカウント集約のドメインエラーを対応する HTTPException として送出する。どのドメインエラーがどのステータス
// かはハンドラ層(HTTP 境界)の責務とする。リポジトリ障害等の想定外エラーはサーバ起因として errorHandler の
// 5xx 処理に委ねる。
export default function throwHttpError(error: Error): never {
  if (error instanceof ActiveUserNotFoundError) {
    throw new HTTPException(404, { message: error.message })
  }
  throw error
}
