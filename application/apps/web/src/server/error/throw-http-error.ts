import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorStatusTable = ReadonlyArray<
  readonly [abstract new (...args: never[]) => Error, ContentfulStatusCode]
>

// 対応表に無いエラー(想定外)は握りつぶさず素通しで再送出し、サーバ起因として errorHandler の 5xx 処理へ委ねる。
export default function throwHttpErrorByTable(error: Error, statusTable: ErrorStatusTable): never {
  for (const [ErrorClass, status] of statusTable) {
    if (error instanceof ErrorClass) {
      throw new HTTPException(status, { message: error.message })
    }
  }
  throw error
}
