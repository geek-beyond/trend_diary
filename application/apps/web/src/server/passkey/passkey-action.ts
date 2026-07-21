import { authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Result } from 'neverthrow'
import type { Env } from '@/env'
import throwHttpError from '@/server/passkey/error'

export type PasskeyActionContext = Context<Env>

// エラー型は execute が実際に返す具象型を TError で受け、HTTP 写像(throwHttpError)へそのまま渡す
export function createPasskeyActionHandler<TOutput, TResponse, TError extends Error>(config: {
  execute: (passkeyClient: PasskeyClient) => Promise<Result<TOutput, TError>>
  respond: (c: PasskeyActionContext, output: TOutput) => TResponse
}) {
  return async (c: PasskeyActionContext) => {
    const passkeyClient = new PasskeyClient(authClientConfig(c))
    const result = await config.execute(passkeyClient)
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
