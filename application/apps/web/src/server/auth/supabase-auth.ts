import { ServerError } from '@trend-diary/common/errors'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { err, ok, type Result } from 'neverthrow'

// Supabase Auth の戻り値のうち成功ブランチ(error が null)の data 型だけを取り出す。
// ユニオンを分配し失敗ブランチを never へ畳む。
type SupabaseAuthData<TResponse> = TResponse extends { error: null; data: infer TData }
  ? TData
  : never

// Supabase Auth SDK は失敗を2経路で表す。通信断など基盤レベルの失敗は例外を投げ、資格情報エラー等の
// 業務的な失敗は戻り値 { error } で返す。この2経路を単一の Result に畳むことで、ハンドラ側の
// 「wrapAsyncCall で例外を見た上に { error } も個別に見る」二段分岐を無くし、エラーは Result(err)
// でのみ扱えるようにする。例外は原因を特定できないため常に ServerError とし、業務エラーのみ mapError
// でドメインエラーへ写す（既定は ServerError。401/409 等へ振り分けたいハンドラだけが mapError を渡す）。
export async function callSupabaseAuth<
  // oxlint-disable-next-line typescript/no-restricted-types -- SDKごとにdata形状が異なる制約用で、具体型は呼び出し時のTResponseが確定するため
  TResponse extends { data: unknown; error: Error | null },
>(
  call: () => Promise<TResponse>,
  mapError: (error: Error) => Error = (error) => new ServerError(error),
): Promise<Result<SupabaseAuthData<TResponse>, Error>> {
  const called = await wrapAsyncCall(call)
  if (called.isErr()) return err(new ServerError(called.error))

  const response = called.value
  if (response.error) return err(mapError(response.error))

  // error が null に絞れた時点で成功ブランチだが、ジェネリックなユニオンは戻り値型へ自動で絞り込め
  // ないため、成功 data 型として明示する
  // oxlint-disable-next-line typescript/consistent-type-assertions -- 上記のとおりジェネリックユニオンの絞り込みを型で表現できないため
  return ok(response.data as SupabaseAuthData<TResponse>)
}
