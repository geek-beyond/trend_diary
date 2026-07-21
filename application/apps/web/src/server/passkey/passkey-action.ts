import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Err, Result } from 'neverthrow'
import type { Env } from '@/env'
import throwHttpError from '@/server/passkey/error'

export type PasskeyActionContext = Context<Env>

type ResultErr<TResult> = TResult extends Err<infer _TValue, infer TError> ? TError : never
// 境界の TError を手書きの基底型で緩めず、PasskeyClient が実際に返すエラー集合を上限にする
type PasskeyClientError = ResultErr<Awaited<ReturnType<PasskeyClient[keyof PasskeyClient]>>>

// TContext を総称化し、zodValidator 適用済みの Context を持つハンドラ（verify 系）もこのファクトリで
// 束ねられるようにする。execute へ c を渡すのは検証済み入力の取得のため
export function createPasskeyActionHandler<
  TOutput,
  TResponse,
  TError extends PasskeyClientError,
  TContext extends PasskeyActionContext = PasskeyActionContext,
>(config: {
  execute: (passkeyClient: PasskeyClient, c: TContext) => Promise<Result<TOutput, TError>>
  respond: (c: TContext, output: TOutput) => TResponse
}) {
  return async (c: TContext) => {
    const passkeyClient = new PasskeyClient(authClientConfig(c))
    const result = await config.execute(passkeyClient, c)
    if (result.isErr()) throwHttpError(result.error)

    return config.respond(c, result.value)
  }
}

export function respondChallengeOptions<TOptions>(
  c: PasskeyActionContext,
  started: { challenge_id: string; options: TOptions },
) {
  return c.json({ challengeId: started.challenge_id, options: started.options }, 200)
}
