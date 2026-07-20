import { type AuthError } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Result } from 'neverthrow'
import type { Env } from '@/env'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
import { type AuthHandlerContext, buildContext } from './context'

interface ClientConfig<TClient, TJson, TAuthOutput, TResponse extends Response> {
  createClient: (c: Context<Env>) => TClient
  authenticate: (
    client: TClient,
    ctx: AuthHandlerContext<TJson>,
  ) => Promise<Result<TAuthOutput, AuthError>>
  log?: (output: TAuthOutput, ctx: AuthHandlerContext<TJson>) => void
  respond: (c: Context<Env>, output: TAuthOutput) => TResponse
}

// respond で c.json/c.body を直接返すのは Hono RPC のレスポンス型推論をハンドラーごとに保つため
export function createClientHandler<TClient, TJson, TAuthOutput, TResponse extends Response>(
  config: ClientConfig<TClient, TJson, TAuthOutput, TResponse>,
): (c: Context<Env>) => Promise<TResponse> {
  return async (c: Context<Env>): Promise<TResponse> => {
    const ctx = buildContext<TJson>(c)
    const client = config.createClient(c)
    const authResult = await config.authenticate(client, ctx)
    if (authResult.isErr()) handleError(toAuthError(authResult.error), ctx.logger)
    if (config.log) config.log(authResult.value, ctx)
    return config.respond(c, authResult.value)
  }
}
