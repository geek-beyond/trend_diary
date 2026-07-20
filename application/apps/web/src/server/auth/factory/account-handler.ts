import { type AuthError } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/account'
import type { Context } from 'hono'
import type { Result } from 'neverthrow'
import type { Env } from '@/env'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
import { type AuthHandlerContext, buildContext } from './context'

type AccountUseCase = ReturnType<typeof createAccountUseCase>

interface AccountConfig<TClient, TJson, TAuthOutput, TAccountOutput, TResponse extends Response> {
  createClient: (c: Context<Env>) => TClient
  authenticate: (
    client: TClient,
    ctx: AuthHandlerContext<TJson>,
  ) => Promise<Result<TAuthOutput, AuthError>>
  resolveAccount: (
    accountUseCase: AccountUseCase,
    authOutput: TAuthOutput,
    ctx: AuthHandlerContext<TJson>,
  ) => Promise<Result<TAccountOutput, Error>>
  log?: (output: TAccountOutput, ctx: AuthHandlerContext<TJson>) => void
  respond: (c: Context<Env>, output: TAccountOutput) => TResponse
}

// respond で c.json/c.body を直接返すのは Hono RPC のレスポンス型推論をハンドラーごとに保つため
export function createAccountHandler<
  TClient,
  TJson,
  TAuthOutput,
  TAccountOutput,
  TResponse extends Response,
>(
  config: AccountConfig<TClient, TJson, TAuthOutput, TAccountOutput, TResponse>,
): (c: Context<Env>) => Promise<TResponse> {
  return async (c: Context<Env>): Promise<TResponse> => {
    const ctx = buildContext<TJson>(c)
    const client = config.createClient(c)
    const authResult = await config.authenticate(client, ctx)
    if (authResult.isErr()) handleError(toAuthError(authResult.error), ctx.logger)
    const accountUseCase = createAccountUseCase(getRdbClient(c.env.DB))
    const accountResult = await config.resolveAccount(accountUseCase, authResult.value, ctx)
    // resolveAccount の err はドメイン由来のため toAuthError を通さない
    if (accountResult.isErr()) handleError(accountResult.error, ctx.logger)
    if (config.log) config.log(accountResult.value, ctx)
    return config.respond(c, accountResult.value)
  }
}
