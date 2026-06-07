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

import { handleError } from '@trend-diary/common/errors'
import type { LoggerType } from '@trend-diary/common/logger'
import getRdbClient, { type RdbClient } from '@trend-diary/datastore/rdb'
import type { Context } from 'hono'
import { HTTPException } from 'hono/http-exception'
import type { ContentfulStatusCode, StatusCode } from 'hono/utils/http-status'
import { type Result } from 'neverthrow'
import type { Env, SessionUser } from '@/web/env'
import CONTEXT_KEY from '@/web/middleware/context'

// コンテキストの型定義
export type RequestContext<TParam = unknown, TJson = unknown, TQuery = unknown> = {
  param: TParam
  json: TJson
  query: TQuery
  user?: SessionUser
  logger: LoggerType
}

// 認証済みコンテキストの型定義（userは必須）
export type AuthenticatedRequestContext<TParam = unknown, TJson = unknown, TQuery = unknown> = {
  param: TParam
  json: TJson
  query: TQuery
  user: SessionUser
  logger: LoggerType
}

// RequestContextから型パラメータを抽出するヘルパー型
type ExtractParam<T> =
  T extends RequestContext<infer P, unknown, unknown>
    ? P
    : T extends AuthenticatedRequestContext<infer P, unknown, unknown>
      ? P
      : unknown
type ExtractJson<T> =
  T extends RequestContext<unknown, infer J, unknown>
    ? J
    : T extends AuthenticatedRequestContext<unknown, infer J, unknown>
      ? J
      : unknown
type ExtractQuery<T> =
  T extends RequestContext<unknown, unknown, infer Q>
    ? Q
    : T extends AuthenticatedRequestContext<unknown, unknown, infer Q>
      ? Q
      : unknown

// 共通のハンドラー設定プロパティ
type BaseHandlerConfig<TUseCase, TContext, TOutput, TResponse> = {
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

    // バリデーションミドルウェアで検証済みのデータを取得するための型ハック
    const validParam = c.req.valid ? c.req.valid('param' as never) : undefined
    const validJson = c.req.valid ? c.req.valid('json' as never) : undefined
    const validQuery = c.req.valid ? c.req.valid('query' as never) : undefined

    const context = {
      param: validParam as ExtractParam<TContext>,
      json: validJson as ExtractJson<TContext>,
      query: validQuery as ExtractQuery<TContext>,
      user: undefined,
      logger,
    } as TContext

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

    // バリデーションミドルウェアで検証済みのデータを取得するための型ハック
    const validParam = c.req.valid ? c.req.valid('param' as never) : undefined
    const validJson = c.req.valid ? c.req.valid('json' as never) : undefined
    const validQuery = c.req.valid ? c.req.valid('query' as never) : undefined

    const authenticatedContext = {
      param: validParam as ExtractParam<TContext>,
      json: validJson as ExtractJson<TContext>,
      query: validQuery as ExtractQuery<TContext>,
      user,
      logger,
    } as TContext

    return executeHandlerLogic(config, authenticatedContext, rdb, c)
  }
}
