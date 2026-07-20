/**
 * 認証クライアント操作のみを行うハンドラーを生成するファクトリー。
 * 「認証クライアント生成 → 認証ステップ(Result<_, AuthError>) → ロギング → レスポンス」を担う
 * (logout / passkey の start・status・disable)。アカウントを解決する経路は account-handler.ts。
 *
 * @note
 * - 認証ステップの err には toAuthError を必ず適用する。
 * - レスポンスは respond コールバックが c.json / c.body を直接返す(Hono RPC のレスポンス型推論を保つため)。
 * - captcha 等の事前検証や authClientConfig の失敗は authenticate/createClient の送出としてそのまま
 *   errorHandler へ伝播させ、ファクトリー側に専用の分岐を持たない。
 * - 成功ログは任意の log コールバックに委ね、message/payload の分岐をファクトリーへ持ち込まない。
 */
import { type AuthError } from '@trend-diary/authentication'
import type { Context } from 'hono'
import type { Result } from 'neverthrow'
import type { Env } from '@/env'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'
import { type AuthHandlerContext, buildContext } from './context'

interface AuthConfig<TClient, TJson, TAuthOutput, TResponse extends Response> {
  // createClient は Hono の Context だけを要するため TJson へは依存させない
  // (検証済み json を注釈する authenticate 側から TJson を一意に推論させるため)。
  createClient: (c: Context<Env>) => TClient
  authenticate: (
    client: TClient,
    ctx: AuthHandlerContext<TJson>,
  ) => Promise<Result<TAuthOutput, AuthError>>
  log?: (output: TAuthOutput, ctx: AuthHandlerContext<TJson>) => void
  respond: (c: Context<Env>, output: TAuthOutput) => TResponse
}

export function createAuthHandler<TClient, TJson, TAuthOutput, TResponse extends Response>(
  config: AuthConfig<TClient, TJson, TAuthOutput, TResponse>,
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
