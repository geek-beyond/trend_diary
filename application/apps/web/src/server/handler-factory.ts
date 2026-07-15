/**
 * API Handler Factory
 *
 * @overview
 * このファクトリー関数は、API層のハンドラーを統一されたパターンで生成するための高階関数。
 * DDDアーキテクチャに基づき、UseCase→Result→Response変換の流れを標準化する。
 *
 * @usage_guidelines
 * **使用可能なケース:**
 * - 静的パスのエンドポイント（例: /api/users、/api/articles）
 * - GETメソッドでqueryパラメータのみを扱うエンドポイント
 * - POSTメソッドでjsonボディのみを扱うエンドポイント
 * - 認証が必要なエンドポイント（requiresAuth: trueで対応可能）
 * - レスポンス型の変換が不要、またはtransform関数で完結するエンドポイント
 *
 * **使用できないケース（Hono clientの型推論の制限）:**
 * - 動的パス（例: /api/roles/:id）と$patchメソッドの組み合わせ
 *   → 型推論失敗: 'json' does not exist in type '{ param: { id: string; } }'
 * - 動的パス（例: /api/roles/:id）と$deleteメソッドの組み合わせ
 *   → フロントエンドでnumber→string変換が必要になり型エラーが発生
 * - レスポンス型が複雑で、フロントエンドで型アサーションが必要になるケース
 *   → factory patternではなく従来の実装を推奨
 *
 * **制限事項の回避策:**
 * 上記の使用できないケースでは、従来のハンドラー実装パターンを使用すること。
 * 従来パターン例:
 * ```typescript
 * export default async function updateRole(
 *   c: ZodValidatedParamJsonContext<z.infer<typeof paramSchema>, z.infer<typeof jsonSchema>>,
 * ) {
 *   const logger = c.get(CONTEXT_KEY.APP_LOG)
 *   const { id } = c.req.valid('param')
 *   const parsedJson = c.req.valid('json')
 *   // ... UseCase実行とエラーハンドリング
 *   return c.json({ role: result.value })
 * }
 * ```
 *
 * @examples
 * 成功事例:
 * - signup.ts（POST /api/user/signup）
 * - getUserList.ts（GET /api/admin/user）
 * - createRole.ts（POST /api/roles）
 * - getRoles.ts（GET /api/roles）
 * - policy系ハンドラー全般
 *
 * 従来実装を維持した事例:
 * - getArticles.ts（レスポンス型推論の問題）
 * - updateRole.ts（動的パス + $patch）
 * - updateRolePermissions.ts（動的パス + $patch）
 * - updateEndpointPermissions.ts（動的パス + $patch）
 * - deleteRole.ts（動的パス + $delete）
 * - deleteEndpoint.ts（動的パス + $delete）
 * - deletePermission.ts（動的パス + $delete）
 */

import type { LoggerType } from '@trend-diary/common/logger'
import getRdbClient, { type RdbClient } from '@trend-diary/datastore/rdb'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import { type Result } from 'neverthrow'
import type { Env, SessionUser } from '@/env'
import CONTEXT_KEY from '@/middleware/context'
import { handleError } from '@/server/handle-error'

// コンテキストの型定義
// oxlint-disable-next-line typescript/no-restricted-types -- ハンドラ側で具象型を指定するまでの既定値で、任意形状を受け入れる必要があるため
export interface RequestContext<TParam = unknown, TJson = unknown, TQuery = unknown> {
  param: TParam
  json: TJson
  query: TQuery
  user?: SessionUser
  logger: LoggerType
}

// 認証済みコンテキストの型定義（userは必須）
// oxlint-disable-next-line typescript/no-restricted-types -- ハンドラ側で具象型を指定するまでの既定値で、任意形状を受け入れる必要があるため
export interface AuthenticatedRequestContext<TParam = unknown, TJson = unknown, TQuery = unknown> {
  param: TParam
  json: TJson
  query: TQuery
  user: SessionUser
  logger: LoggerType
}

// バリデーション済みデータを保持する中間表現
// Hono clientの型推論を迂回してミドルウェア検証済みの値を取り出すための器
interface ValidatedRequestData {
  // oxlint-disable-next-line typescript/no-restricted-types -- ミドルウェア検証済みだが Hono の型推論では静的に確定できない値を保持するため
  param: unknown
  // oxlint-disable-next-line typescript/no-restricted-types -- ミドルウェア検証済みだが Hono の型推論では静的に確定できない値を保持するため
  json: unknown
  // oxlint-disable-next-line typescript/no-restricted-types -- ミドルウェア検証済みだが Hono の型推論では静的に確定できない値を保持するため
  query: unknown
}

// Hono clientの型推論はミドルウェアのバリデーション結果を静的に解決できないため、
// 検証済みデータの取り出しはこのヘルパーに型ハックを閉じ込めて一元管理する
function extractValidatedData(c: Context<Env>): ValidatedRequestData {
  if (!c.req.valid) {
    return { param: undefined, json: undefined, query: undefined }
  }
  // valid は内部で this（c.req）を参照するメソッドのため、変数へ取り出すとレシーバが外れて壊れる。
  // bind でレシーバを固定する。ジェネリックな Context では引数型が never に潰れるため呼び出しキーの型のみ補う。
  // oxlint-disable-next-line typescript/consistent-type-assertions, typescript/no-restricted-types -- ジェネリックな Context では valid() の引数型が never に潰れ検証キーの型を補うアサーションが避けられず、戻り値も検証前の未確定な値となるため
  const valid = c.req.valid.bind(c.req) as (key: 'param' | 'json' | 'query') => unknown
  return {
    param: valid('param'),
    json: valid('json'),
    query: valid('query'),
  }
}

// 検証済みデータとユーザー・ロガーから、ハンドラーが要求する具象コンテキスト型を構築する
// ValidatedRequestData の各値は実行時にミドルウェアで TContext に整合する形へ検証済みのため、
// ジェネリックな TContext への橋渡しはこのヘルパーに集約する
function buildRequestContext<TContext extends RequestContext | AuthenticatedRequestContext>(
  data: ValidatedRequestData,
  user: SessionUser | undefined,
  logger: LoggerType,
): TContext {
  const context: RequestContext = {
    param: data.param,
    json: data.json,
    query: data.query,
    user,
    logger,
  }
  // oxlint-disable-next-line typescript/consistent-type-assertions -- ミドルウェア検証済みの値をジェネリックな TContext へ橋渡しする唯一の地点で、静的型では表現できないため許可する
  return context as TContext
}

// 共通のハンドラー設定プロパティ
interface BaseHandlerConfig<TUseCase, TContext, TOutput, TResponse> {
  // UseCaseファクトリー
  createUseCase: (rdb: RdbClient) => TUseCase

  // メインロジック
  execute: (useCase: TUseCase, context: TContext) => Promise<Result<TOutput, Error>>

  // レスポンス変換（オプション）
  transform?: (output: TOutput) => TResponse

  // ログメッセージ（オプション）
  // outputとcontextの両方を受け取れる
  logMessage?: string | ((output: TOutput, context: TContext) => string)

  // ログペイロード（オプション）
  // IMPORTANT: 未指定の場合は空のペイロード{}がログに出力される
  // セキュリティとパフォーマンスのため、必要な情報のみを明示的に指定すること
  // 大量のデータを返すハンドラーでは、サマリー情報のみをログに出力することを推奨
  // oxlint-disable-next-line typescript/no-restricted-types -- 任意の構造化データをログ出力するペイロードで、値の型を限定できないため
  logPayload?: (output: TOutput, context: TContext) => Record<string, unknown>

  // HTTPステータスコード（必須）
  statusCode: StatusCode
}

// 認証不要なハンドラーの設定
type SimpleHandlerConfig<
  TUseCase,
  TContext extends RequestContext,
  TOutput,
  TResponse = TOutput,
> = BaseHandlerConfig<TUseCase, TContext, TOutput, TResponse>

// 認証が必要なハンドラーの設定
type AuthenticatedHandlerConfig<
  TUseCase,
  TContext extends AuthenticatedRequestContext,
  TOutput,
  TResponse = TOutput,
> = BaseHandlerConfig<TUseCase, TContext, TOutput, TResponse>

/**
 * ハンドラーの共通ロジックを実行する内部関数
 */
function executeHandlerLogic<
  TUseCase,
  TContext extends RequestContext | AuthenticatedRequestContext,
  TOutput,
  TResponse,
>(
  config: BaseHandlerConfig<TUseCase, TContext, TOutput, TResponse>,
  context: TContext,
  rdb: RdbClient,
  c: Context<Env>,
): Promise<Response> {
  return (async () => {
    // 1. UseCase実行
    const useCase = config.createUseCase(rdb)
    const result = await config.execute(useCase, context)

    // 2. エラーハンドリング
    if (result.isErr()) {
      throw handleError(result.error, context.logger)
    }

    // 3. ロギング
    if (config.logMessage) {
      const message =
        typeof config.logMessage === 'function'
          ? config.logMessage(result.value, context)
          : config.logMessage

      const payload = config.logPayload ? config.logPayload(result.value, context) : {}

      context.logger.info({ msg: message, ...payload })
    }

    // 4. レスポンス変換とレスポンス返却
    const statusCode = config.statusCode

    // 204 No Contentの場合はボディなしで返す
    if (statusCode === 204) {
      return c.body(null, 204)
    }

    const responseData = config.transform ? config.transform(result.value) : result.value
    // oxlint-disable-next-line typescript/consistent-type-assertions -- 204 を分岐済みで残るのはボディを持つステータスのみだが、StatusCode から ContentfulStatusCode への絞り込みを型で表現できないため許可する
    return c.json(responseData, statusCode as ContentfulStatusCode)
  })()
}

/**
 * シンプルなAPIハンドラーを生成する高階関数（認証不要）
 *
 * @remarks
 * この関数を使用する際は、リクエストパラメータやボディを期待するルートには
 * 必ずバリデーションミドルウェア（zodValidator等）を適用してください。
 * バリデーションミドルウェアが適用されていない場合、param/json/queryがundefinedとなり、
 * execute関数内でランタイムエラーが発生する可能性があります。
 *
 * @example
 * ```typescript
 * // 基本的な使用例
 * export default createSimpleApiHandler({
 *   createUseCase: createPrivacyPolicyUseCase,
 *   execute: (useCase, context: RequestContext<unknown, PrivacyPolicyInput>) =>
 *     useCase.createPolicy(context.json.content),
 *   logMessage: 'Policy created',
 *   logPayload: (policy) => ({ version: policy.version }),
 *   statusCode: 201,
 * })
 *
 * // 大量のデータを返すハンドラーの例（logPayloadでサマリー情報のみをログに出力）
 * export default createSimpleApiHandler({
 *   createUseCase: createPrivacyPolicyUseCase,
 *   execute: (useCase, context: RequestContext<unknown, unknown, OffsetPaginationParams>) =>
 *     useCase.getAllPolicies(context.query.page, context.query.limit),
 *   logMessage: 'Privacy policies retrieved successfully',
 *   logPayload: (data, { query }) => ({
 *     count: data.data.length,
 *     page: query.page,
 *     limit: query.limit,
 *     total: data.total,
 *   }),
 *   statusCode: 200,
 * })
 * ```
 */
export function createSimpleApiHandler<
  TUseCase,
  TContext extends RequestContext,
  TOutput,
  TResponse = TOutput,
>(config: SimpleHandlerConfig<TUseCase, TContext, TOutput, TResponse>) {
  return async (c: Context<Env>): Promise<Response> => {
    const logger = c.get(CONTEXT_KEY.APP_LOG)
    const rdb = getRdbClient(c.env.DB)

    const context = buildRequestContext<TContext>(extractValidatedData(c), undefined, logger)

    return executeHandlerLogic(config, context, rdb, c)
  }
}

/**
 * 認証が必要なAPIハンドラーを生成する高階関数
 *
 * @remarks
 * この関数を使用する際は、リクエストパラメータやボディを期待するルートには
 * 必ずバリデーションミドルウェア（zodValidator等）を適用してください。
 * バリデーションミドルウェアが適用されていない場合、param/json/queryがundefinedとなり、
 * execute関数内でランタイムエラーが発生する可能性があります。
 *
 * @example
 * ```typescript
 * // 認証が必要な場合（context.userは型安全にアクセス可能）
 * export default createAuthenticatedApiHandler({
 *   createUseCase: createArticleUseCase,
 *   execute: async (useCase, context: AuthenticatedRequestContext<ArticleIdParam, ReadHistoryInput>) => {
 *     // context.userは必ず存在し、型アサーション不要
 *     return useCase.createReadHistory(
 *       context.user.activeUserId,
 *       context.param.article_id,
 *       new Date(context.json.read_at),
 *     )
 *   },
 *   transform: () => ({ message: '記事を既読にしました' }),
 *   logMessage: 'Read history created successfully',
 *   logPayload: (_result, context) => ({
 *     activeUserId: context.user.activeUserId,
 *     articleId: context.param.article_id,
 *   }),
 *   statusCode: 201,
 * })
 * ```
 */
export function createAuthenticatedApiHandler<
  TUseCase,
  TContext extends AuthenticatedRequestContext,
  TOutput,
  TResponse = TOutput,
>(config: AuthenticatedHandlerConfig<TUseCase, TContext, TOutput, TResponse>) {
  return async (c: Context<Env>): Promise<Response> => {
    const logger = c.get(CONTEXT_KEY.APP_LOG)
    const rdb = getRdbClient(c.env.DB)

    // 認証チェック
    const user = c.get(CONTEXT_KEY.SESSION_USER)
    if (!user) {
      throw new HTTPException(401, { message: 'Unauthorized' })
    }

    const authenticatedContext = buildRequestContext<TContext>(
      extractValidatedData(c),
      user,
      logger,
    )

    return executeHandlerLogic(config, authenticatedContext, rdb, c)
  }
}
