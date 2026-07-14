import { wrapAsyncCall } from '@trend-diary/common/result'
import { err, ok, type Result } from 'neverthrow'
import { type AuthenticationError, UnexpectedAuthError } from './errors'

type SupabaseData<TResponse> = TResponse extends { error: null; data: infer TData } ? TData : never

// Supabase SDK は失敗を例外(通信断など基盤の失敗)と戻り値 { error }(業務エラー)の2経路で返す。
// 例外は原因を特定できないため一律 UnexpectedAuthError とし、区別できる業務エラーのみ mapError に委ねる。
export async function callSupabase<
  // oxlint-disable-next-line typescript/no-restricted-types -- SDKごとにdata形状が異なる制約用で、具体型は呼び出し時のTResponseが確定するため
  TResponse extends { data: unknown; error: Error | null },
>(
  call: () => Promise<TResponse>,
  mapError: (error: Error) => AuthenticationError = (error) =>
    new UnexpectedAuthError(error.message, { cause: error }),
): Promise<Result<SupabaseData<TResponse>, AuthenticationError>> {
  const called = await wrapAsyncCall(call)
  if (called.isErr())
    return err(new UnexpectedAuthError(called.error.message, { cause: called.error }))

  const response = called.value
  if (response.error) return err(mapError(response.error))

  // oxlint-disable-next-line typescript/consistent-type-assertions -- ジェネリックなユニオンは error=null 判定後も戻り値型へ絞り込めないため
  return ok(response.data as SupabaseData<TResponse>)
}
