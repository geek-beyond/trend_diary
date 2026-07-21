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

// 認証ハンドラが共通で持つ「1 処理の Result を受け、err ならスライス固有の HTTP 写像へ委譲、ok なら値を使う」
// という契約を集約する。写像先を引数で受けることで、各スライスのエラー対応表をハンドラ側に残したまま束ねる
export function unwrapOrThrowHttp<T, E = Error>(
  result: Result<T, E>,
  throwHttpError: (error: E) => never,
): T {
  if (result.isErr()) throwHttpError(result.error)
  return result.value
}
