import type { Result } from 'neverthrow'

// 認証ハンドラが共通で持つ「1 処理の Result を受け、err ならスライス固有の HTTP 写像へ委譲、ok なら値を使う」
// という契約を集約する。写像先を引数で受けることで、各スライスのエラー対応表をハンドラ側に残したまま束ねる
export default function unwrapOrThrowHttp<T>(
  result: Result<T, Error>,
  throwHttpError: (error: Error) => never,
): T {
  if (result.isErr()) throwHttpError(result.error)
  return result.value
}
