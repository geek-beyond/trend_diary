import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

// ドメインエラー → HTTP ステータスの対応表。凝集度を保つため中身は各集約側で定義する。
export type ErrorStatusTable = ReadonlyArray<
  readonly [abstract new (...args: never[]) => Error, ContentfulStatusCode]
>

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
