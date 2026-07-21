import {
  type AuthError,
  authClientConfig,
  NoSessionError,
  PasskeyClient,
  PasskeyRegistrationError,
  PasskeyVerificationError,
} from '@trend-diary/authentication'
import { ClientError, ServerError } from '@trend-diary/std/errors'
import type { Context } from 'hono'
import type { Result } from 'neverthrow'
import type { Env } from '@/env'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import { handleError } from '@/server/handle-error'

export type PasskeyActionContext = Context<Env>

export function createPasskeyActionHandler<TOutput, TResponse>(config: {
  execute: (passkeyClient: PasskeyClient) => Promise<Result<TOutput, AuthError>>
  respond: (c: PasskeyActionContext, output: TOutput) => TResponse
}) {
  return async (c: PasskeyActionContext) => {
    const logger = mustGet(c, CONTEXT_KEY.APP_LOG)

    const passkeyClient = new PasskeyClient(authClientConfig(c))
    const result = await config.execute(passkeyClient)
    if (result.isErr()) {
      // 認証パッケージのエラーは HTTP を知らないため、passkey 操作で起こり得る種別を対応する
      // クライアントエラーへ写像し、それ以外はサーバ起因として 500 に倒す
      const authError = result.error
      if (authError instanceof PasskeyRegistrationError) {
        handleError(new ClientError(authError.message, 400), logger)
      }
      if (authError instanceof PasskeyVerificationError) {
        handleError(new ClientError(authError.message, 401), logger)
      }
      if (authError instanceof NoSessionError) {
        handleError(new ClientError(authError.message, 401), logger)
      }
      handleError(new ServerError(authError), logger)
    }

    return config.respond(c, result.value)
  }
}

export function respondChallengeOptions<TOptions>(
  c: PasskeyActionContext,
  started: { challenge_id: string; options: TOptions },
) {
  return c.json({ challengeId: started.challenge_id, options: started.options }, 200)
}
