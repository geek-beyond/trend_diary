import { wrapAsyncCall } from '@trend-diary/std/result'
import { err, ok, type Result } from 'neverthrow'
import { type AuthError, UnexpectedAuthError } from '../errors'

type SupabaseData<TResponse> = TResponse extends { error: null; data: infer TData } ? TData : never

interface SupabaseCallResponse {
  // oxlint-disable-next-line typescript/no-restricted-types -- SDKごとにdata形状が異なる制約用で、具体型は呼び出し時のTResponseが確定するため
  data: unknown
  error: Error | null
}

// Supabase SDK は失敗を例外(通信断など基盤の失敗)と戻り値 { error }(業務エラー)の2経路で返す。
// 例外は原因を特定できないため一律 UnexpectedAuthError とし、区別できる業務エラーのみ mapError に委ねる。
// オーバーロードで mapError の有無と戻りエラー型を対応づけ、省略時は UnexpectedAuthError に固定、
// 指定時のみ例外由来の UnexpectedAuthError と mapError の戻り型 TError の和を返す。
// これにより「TError を指定しつつ mapError を渡し忘れる」不整合をコンパイル時に防ぐ。
export async function callSupabase<TResponse extends SupabaseCallResponse>(
  call: () => Promise<TResponse>,
): Promise<Result<SupabaseData<TResponse>, UnexpectedAuthError>>
export async function callSupabase<
  TResponse extends SupabaseCallResponse,
  TError extends AuthError,
>(
  call: () => Promise<TResponse>,
  mapError: (error: Error) => TError,
): Promise<Result<SupabaseData<TResponse>, UnexpectedAuthError | TError>>
export async function callSupabase<
  TResponse extends SupabaseCallResponse,
  TError extends AuthError = UnexpectedAuthError,
>(
  call: () => Promise<TResponse>,
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
