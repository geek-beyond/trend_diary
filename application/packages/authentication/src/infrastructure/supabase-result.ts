import { wrapAsyncCall } from '@trend-diary/std/result'
import { err, ok, type Result } from 'neverthrow'
import { type AuthError, UnexpectedAuthError } from '../errors'

type SupabaseData<TResponse> = TResponse extends { error: null; data: infer TData } ? TData : never

// Supabase SDK は失敗を例外(通信断など基盤の失敗)と戻り値 { error }(業務エラー)の2経路で返す。
// 例外は原因を特定できないため一律 UnexpectedAuthError とし、区別できる業務エラーのみ mapError に委ねる。
// 戻り型は例外由来の UnexpectedAuthError と mapError の戻り型 TError の和で表し、呼び出し側で実際のエラー集合へ絞れるようにする。
export async function callSupabase<
  // oxlint-disable-next-line typescript/no-restricted-types -- SDKごとにdata形状が異なる制約用で、具体型は呼び出し時のTResponseが確定するため
  TResponse extends { data: unknown; error: Error | null },
  TError extends AuthError = UnexpectedAuthError,
>(
  call: () => Promise<TResponse>,
  // 既定は業務エラーを区別せず UnexpectedAuthError に畳む。ジェネリックな TError を戻す既定値は
  // 型として表現できないため、既定関数ではなく未指定時の分岐で UnexpectedAuthError を返す
  mapError?: (error: Error) => TError,
): Promise<Result<SupabaseData<TResponse>, UnexpectedAuthError | TError>> {
  const called = await wrapAsyncCall(call)
  if (called.isErr()) return err(new UnexpectedAuthError(called.error.message))

  const response = called.value
  if (response.error) {
    return err(
      mapError ? mapError(response.error) : new UnexpectedAuthError(response.error.message),
    )
  }

  // oxlint-disable-next-line typescript/consistent-type-assertions -- ジェネリックなユニオンは error=null 判定後も戻り値型へ絞り込めないため
  return ok(response.data as SupabaseData<TResponse>)
}
