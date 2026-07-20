/**
 * Auth Handler Factory
 *
 * @overview
 * 認証(auth-client)系ハンドラーを生成する高階関数。共通契約は
 * 「認証クライアント生成 → 認証ステップ(Result<_, AuthError>) → ロギング → レスポンス」。
 * アプリのアカウント(CurrentUser)を解決するかどうかで用途を 2 つに分ける:
 * - createAuthHandler: 認証クライアント操作のみ(logout / passkey の start・status・disable)
 * - createAccountAuthHandler: 認証成功後にアカウントを解決する(login / signup / passkey login verify)
 * 用途を型で分けることで、統一ファクトリ + 実行時判別(`'resolveAccount' in config`)や
 * オーバーロードを持たず、各ファクトリを素直に読める形にしている。
 *
 * @note handler-factory.ts(datastore系)との意図的な差分:
 * - 認証ステップの err には toAuthError を必ず適用する。アカウントステップの err はドメイン由来の
 *   ため toAuthError を通さず handleError にそのまま渡す。
 * - レスポンスは respond コールバックが c.json / c.body を直接返す。Hono RPC のレスポンス型推論を
 *   ハンドラーごとに保つため、レスポンス生成をファクトリー内へ隠さず呼び出し側へ残す。
 * - captcha 等の事前検証や authClientConfig の失敗は authenticate/createClient の送出として
 *   そのまま errorHandler へ伝播させ、ファクトリー側に専用の分岐を持たない。
 * - 成功ログは任意の log コールバックに委ね、message/payload の分岐をファクトリーへ持ち込まない。
 */
import { type AuthError } from '@trend-diary/authentication'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createAccountUseCase } from '@trend-diary/domain/account'
import type { LoggerType } from '@trend-diary/logger'
import type { Context } from 'hono'
import type { Result } from 'neverthrow'
import type { Env } from '@/env'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import toAuthError from '@/server/error/auth-error'
import { handleError } from '@/server/error/handle-error'

type AccountUseCase = ReturnType<typeof createAccountUseCase>

// コールバックへ渡す最小コンテキスト。json はミドルウェア検証済みだが Hono の型では静的に確定できない
// ため、ハンドラー側が TJson を注釈して具象化する(handler-factory.ts の RequestContext と同じ思想)。
// oxlint-disable-next-line typescript/no-restricted-types -- ハンドラ側で TJson を具象化するまでの既定値で、任意形状を受け入れる必要があるため
export interface AuthHandlerContext<TJson = unknown> {
  c: Context<Env>
  json: TJson
  logger: LoggerType
}

// ミドルウェア検証済みだが Hono のジェネリック Context では静的に解決できない json を取り出す。
// 型ハックはこの一点に閉じ込める(handler-factory.ts の extractValidatedData と同じ方針)。
function extractValidatedJson(c: Context<Env>) {
  // valid は内部で this(c.req)を参照するため、変数へ取り出すとレシーバが外れて壊れる。bind で固定する。
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- ジェネリックな Context では valid() の引数型が never へ潰れ、戻り値も検証前の未確定な値のため
  const valid = c.req.valid.bind(c.req) as (key: 'json') => unknown
  return valid('json')
}

// 検証済み json をハンドラー注釈の TJson へ橋渡しする唯一の地点(handler-factory の buildRequestContext と同方針)。
function buildContext<TJson>(c: Context<Env>): AuthHandlerContext<TJson> {
  // oxlint-disable-next-line typescript/consistent-type-assertions -- ミドルウェア検証済みの json をジェネリックな TJson へ橋渡しするため、静的型では表現できない
  return {
    c,
    json: extractValidatedJson(c),
    logger: mustGet(c, CONTEXT_KEY.APP_LOG),
  } as AuthHandlerContext<TJson>
}

// 認証クライアント操作のみを行うハンドラーの設定
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

// 認証成功後にアカウントを解決するハンドラーの設定。resolveAccount の err は
// toAuthError を通さずドメインエラーのまま handleError へ渡す。
interface AccountAuthConfig<
  TClient,
  TJson,
  TAuthOutput,
  TAccountOutput,
  TResponse extends Response,
> {
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

/**
 * 認証クライアント操作のみを行うハンドラーを生成する。
 */
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

/**
 * 認証成功後にアカウントを解決するハンドラーを生成する。
 */
export function createAccountAuthHandler<
  TClient,
  TJson,
  TAuthOutput,
  TAccountOutput,
  TResponse extends Response,
>(
  config: AccountAuthConfig<TClient, TJson, TAuthOutput, TAccountOutput, TResponse>,
): (c: Context<Env>) => Promise<TResponse> {
  return async (c: Context<Env>): Promise<TResponse> => {
    const ctx = buildContext<TJson>(c)

    const client = config.createClient(c)
    const authResult = await config.authenticate(client, ctx)
    if (authResult.isErr()) handleError(toAuthError(authResult.error), ctx.logger)

    // ドメイン由来の err はそのまま handleError へ(toAuthError を通さない)。
    const accountUseCase = createAccountUseCase(getRdbClient(c.env.DB))
    const accountResult = await config.resolveAccount(accountUseCase, authResult.value, ctx)
    if (accountResult.isErr()) handleError(accountResult.error, ctx.logger)

    if (config.log) config.log(accountResult.value, ctx)
    return config.respond(c, accountResult.value)
  }
}
