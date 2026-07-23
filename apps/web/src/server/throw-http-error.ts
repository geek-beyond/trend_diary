import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Result } from 'neverthrow'

export type ErrorStatusTable = ReadonlyArray<
  readonly [abstract new (...args: never[]) => Error, ContentfulStatusCode]
>

// 対応表に無いエラー(想定外)はサーバ起因として 500 に写像する。errorHandler へ素の Error を素通しすると
// 「想定外の未処理エラー」として扱われるため、境界で HTTPException に変換して 5xx の意図を明示する。
export default function throwHttpErrorByTable(error: Error, statusTable: ErrorStatusTable): never {
  for (const [ErrorClass, status] of statusTable) {
    if (error instanceof ErrorClass) {
      throw new HTTPException(status, { message: error.message })
    }
  }
  throw new HTTPException(500, { message: error.message })
}

// 認証ハンドラ群の契約由来の err 分岐の重複を畳むためのヘルパ。写像先を引数で受けるのは、
// 各スライスのエラー対応表をハンドラ側に残したまま共通部分だけを束ねるため
export function unwrapOrThrowHttp<T, E = Error>(
  result: Result<T, E>,
  throwHttpError: (error: E) => never,
): T {
  if (result.isErr()) throwHttpError(result.error)
  return result.value
}
