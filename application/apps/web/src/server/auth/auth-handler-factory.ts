/**
 * Auth Handler Factory
 *
 * @overview
 * 認証(auth-client)系ハンドラーを統一パターンで生成する高階関数。
 * 「認証クライアント生成 → 認証ステップ(Result<_, AuthError>) → (任意)アカウント紐付けステップ
 *  → ロギング → レスポンス」という共通契約を1箇所へ集約する。
 *
 * @note handler-factory.ts(datastore系)との意図的な差分:
 * - 認証ステップの err には toAuthError を必ず適用する。アカウントステップの err はドメイン由来の
 *   ため toAuthError を通さず handleError にそのまま渡す。
 * - レスポンスは respond コールバックが c.json / c.body を直接返す。Hono RPC のレスポンス型推論を
 *   ハンドラーごとに保つため、レスポンス生成をファクトリー内へ隠さず呼び出し側へ残す。
 * - 成功ログは任意の log コールバックに委ね、message/payload の分岐をファクトリーへ持ち込まない
 *   (未使用の分岐を作らず、ハンドラーごとに従来どおりのログ形状をそのまま書けるようにするため)。
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

// 認証系ハンドラーの共通設定(認証成功後にアカウント紐付けを行う)。resolveAccount の err は
// toAuthError を通さずドメインエラーのまま handleError へ渡す。
interface AccountAuthConfig<
  TClient,
  TJson,
  TAuthOutput,
  TAccountOutput,
  TResponse extends Response,
> {
  createClient: (ctx: AuthHandlerContext<TJson>) => TClient
  beforeAuthenticate?: (ctx: AuthHandlerContext<TJson>) => Promise<void>
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

// 認証系ハンドラーの共通設定(アカウント紐付けなし)
interface ThinAuthConfig<TClient, TJson, TAuthOutput, TResponse extends Response> {
  createClient: (ctx: AuthHandlerContext<TJson>) => TClient
  beforeAuthenticate?: (ctx: AuthHandlerContext<TJson>) => Promise<void>
  authenticate: (
    client: TClient,
    ctx: AuthHandlerContext<TJson>,
  ) => Promise<Result<TAuthOutput, AuthError>>
  log?: (output: TAuthOutput, ctx: AuthHandlerContext<TJson>) => void
  respond: (c: Context<Env>, output: TAuthOutput) => TResponse
}

// 実装シグネチャは全オーバーロードを 1 つの本体で受けるため、型引数を消去した設定型を用意する。
// oxlint-disable-next-line typescript/no-restricted-types -- 全オーバーロードを受けるため型引数を任意形状にする必要があるため
type ErasedAccountConfig = AccountAuthConfig<unknown, unknown, unknown, unknown, Response>
// oxlint-disable-next-line typescript/no-restricted-types -- 全オーバーロードを受けるため型引数を任意形状にする必要があるため
type ErasedThinConfig = ThinAuthConfig<unknown, unknown, unknown, Response>

// ミドルウェア検証済みだが Hono のジェネリック Context では静的に解決できない json を取り出す。
// 型ハックはこの一点に閉じ込める(handler-factory.ts の extractValidatedData と同じ方針)。
function extractValidatedJson(c: Context<Env>) {
  // valid は内部で this(c.req)を参照するため、変数へ取り出すとレシーバが外れて壊れる。bind で固定する。
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- ジェネリックな Context では valid() の引数型が never へ潰れ、戻り値も検証前の未確定な値のため
  const valid = c.req.valid.bind(c.req) as (key: 'json') => unknown
  return valid('json')
}

/**
 * 認証系ハンドラーを生成する(認証成功後にアカウント紐付けを行う)。
 */
export function createAuthHandler<
  TClient,
  TJson,
  TAuthOutput,
  TAccountOutput,
  TResponse extends Response,
>(
  config: AccountAuthConfig<TClient, TJson, TAuthOutput, TAccountOutput, TResponse>,
): (c: Context<Env>) => Promise<TResponse>
/**
 * 認証系ハンドラーを生成する(アカウント紐付けなし)。
 */
export function createAuthHandler<TClient, TJson, TAuthOutput, TResponse extends Response>(
  config: ThinAuthConfig<TClient, TJson, TAuthOutput, TResponse>,
): (c: Context<Env>) => Promise<TResponse>
export function createAuthHandler(
  config: ErasedAccountConfig | ErasedThinConfig,
): (c: Context<Env>) => Promise<Response> {
  return async (c: Context<Env>): Promise<Response> => {
    const logger = mustGet(c, CONTEXT_KEY.APP_LOG)
    const ctx: AuthHandlerContext = { c, json: extractValidatedJson(c), logger }

    // 1. 認証前フック(captcha 等)。失敗時はフック内の handleError が送出する。
    if (config.beforeAuthenticate) await config.beforeAuthenticate(ctx)

    // 2. 認証ステップ。err は必ず toAuthError で HTTP エラーへ変換する。
    const client = config.createClient(ctx)
    const authResult = await config.authenticate(client, ctx)
    if (authResult.isErr()) handleError(toAuthError(authResult.error), logger)

    // 3. (任意)アカウント紐付け。ドメイン由来の err はそのまま handleError へ(toAuthError を通さない)。
    let output = authResult.value
    if ('resolveAccount' in config) {
      const accountUseCase = createAccountUseCase(getRdbClient(c.env.DB))
      const accountResult = await config.resolveAccount(accountUseCase, authResult.value, ctx)
      if (accountResult.isErr()) handleError(accountResult.error, logger)
      output = accountResult.value
    }

    // 4. ロギング(呼び出し側が最終出力を使って任意の成功ログを出す)。
    if (config.log) config.log(output, ctx)

    // 5. レスポンス生成(呼び出し側が c.json / c.body を直接返し RPC 型を保つ)。
    return config.respond(c, output)
  }
}
