import { type AuthError, authClientConfig, PasskeyClient } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Result } from 'neverthrow'
import type { Env } from '@/env'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'

export type PasskeyActionContext = Context<Env>

export function createPasskeyActionHandler<TOutput, TResponse>(config: {
  execute: (passkeyClient: PasskeyClient) => Promise<Result<TOutput, AuthError>>
  respond: (c: PasskeyActionContext, output: TOutput) => TResponse
}) {
  return async (c: PasskeyActionContext) => {
    const logger = mustGet(c, CONTEXT_KEY.APP_LOG)

    const passkeyClient = new PasskeyClient(authClientConfig(c))
    const result = await config.execute(passkeyClient)
    if (result.isErr()) handleError(toAuthError(result.error), logger)

    return config.respond(c, result.value)
  }
}

export function respondChallengeOptions<TOptions>(
  c: PasskeyActionContext,
  started: { challenge_id: string; options: TOptions },
) {
  return c.json({ challengeId: started.challenge_id, options: started.options }, 200)
}
