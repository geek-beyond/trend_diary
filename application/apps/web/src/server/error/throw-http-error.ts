import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export type ErrorStatusTable = ReadonlyArray<
  readonly [abstract new (...args: never[]) => Error, ContentfulStatusCode]
>

// 対応表に一致するドメインエラーだけ HTTPException へ写像する。対応表に無いエラー(想定外)は握りつぶさず
// 素通しで再送出し、サーバ起因として errorHandler の 5xx 処理へ委ねる。集約ごとに対応表を束ねて使い回す。
export default function throwHttpErrorByTable(error: Error, statusTable: ErrorStatusTable): never {
  for (const [ErrorClass, status] of statusTable) {
    if (error instanceof ErrorClass) {
      throw new HTTPException(status, { message: error.message })
    }
  }
  throw error
}
