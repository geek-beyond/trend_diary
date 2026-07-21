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

export type PasskeyActionContext = Context<Env>

export function createPasskeyActionHandler<TOutput, TResponse>(config: {
  execute: (passkeyClient: PasskeyClient) => Promise<Result<TOutput, AuthError>>
  respond: (c: PasskeyActionContext, output: TOutput) => TResponse
}) {
  return async (c: PasskeyActionContext) => {
    const passkeyClient = new PasskeyClient(authClientConfig(c))
    const result = await config.execute(passkeyClient)
    if (result.isErr()) {
      // 認証パッケージのエラーは HTTP を知らないため、passkey 操作で起こり得る種別を対応する
      // クライアントエラーへ写像し、それ以外はサーバ起因として 500 に倒す。HTTP への最終変換は errorHandler が担う
      const authError = result.error
      if (authError instanceof PasskeyRegistrationError) {
        throw new ClientError(authError.message, 400)
      }
      if (authError instanceof PasskeyVerificationError) {
        throw new ClientError(authError.message, 401)
      }
      if (authError instanceof NoSessionError) {
        throw new ClientError(authError.message, 401)
      }
      throw new ServerError(authError)
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
