import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { createAccountUseCase } from '@trend-diary/domain/account'
import type { Context } from 'hono'
import type { Err, Result } from 'neverthrow'
import type { Env } from '@/env'
import throwHttpError from '@/server/passkey/error'
import { unwrapOrThrowHttp } from '@/server/throw-http-error'

export type PasskeyActionContext = Context<Env>

type ResultErr<TResult> = TResult extends Err<infer _TValue, infer TError> ? TError : never
// 境界の TError を手書きの基底型で緩めず、execute が実際に返しうるエラー集合を上限にする。
// パスキーログインは認証後に active_user 解決まで execute で行うため、その失敗集合も含める
type PasskeyClientError = ResultErr<Awaited<ReturnType<PasskeyClient[keyof PasskeyClient]>>>
type AccountUseCase = ReturnType<typeof createAccountUseCase>
type ActiveUserResolutionError = ResultErr<Awaited<ReturnType<AccountUseCase['resolveActiveUser']>>>

// execute へ c を渡すのは、verify 系ハンドラが検証済み入力（zodValidator 適用済み Context）を
// 必要とするため。TContext に既定値を置くのは、入力を持たない既存ハンドラを変えずに済ませるため
export function createPasskeyActionHandler<
  TOutput,
  TResponse,
  TError extends PasskeyClientError | ActiveUserResolutionError,
  TContext extends PasskeyActionContext = PasskeyActionContext,
>(config: {
  execute: (passkeyClient: PasskeyClient, c: TContext) => Promise<Result<TOutput, TError>>
  respond: (c: TContext, output: TOutput) => TResponse
}) {
  return async (c: TContext) => {
    const passkeyClient = new PasskeyClient(authClientConfig(c))
    const result = await config.execute(passkeyClient, c)

    return config.respond(c, unwrapOrThrowHttp(result, throwHttpError))
  }
}

export function respondChallengeOptions<TOptions>(
  c: PasskeyActionContext,
  started: { challenge_id: string; options: TOptions },
) {
  return c.json({ challengeId: started.challenge_id, options: started.options }, 200)
}
