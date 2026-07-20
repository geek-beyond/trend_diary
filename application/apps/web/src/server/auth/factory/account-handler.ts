/**
 * 認証成功後にアプリのアカウント(CurrentUser)を解決するハンドラーを生成するファクトリー。
 * 「認証クライアント生成 → 認証ステップ → アカウント解決 → ロギング → レスポンス」を担う
 * (login / signup / passkey login verify)。アカウントを伴わない経路は auth-handler.ts。
 *
 * @note
 * - 認証ステップの err には toAuthError を適用する。一方 resolveAccount の err はドメイン由来のため
 *   toAuthError を通さず handleError にそのまま渡す(変換の非対称を契約として明示する)。
 * - レスポンスは respond コールバックが c.json / c.body を直接返す(Hono RPC のレスポンス型推論を保つため)。
 * - 成功ログは任意の log コールバックに委ねる。
 */
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
    if (accountResult.isErr()) handleError(accountResult.error, ctx.logger)

    if (config.log) config.log(accountResult.value, ctx)
    return config.respond(c, accountResult.value)
  }
}
