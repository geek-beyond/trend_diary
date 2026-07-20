import getRdbClient from '@trend-diary/datastore/rdb'
import { createArticleUseCase } from '@trend-diary/domain/article'
import type { Result } from 'neverthrow'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { handleError } from '@/server/error/handle-error'
import type { articleIdParamValidator } from './handler/read-article'

type ArticleUseCase = ReturnType<typeof createArticleUseCase>

export type ArticleActionContext = ZodValidatedContext<[typeof articleIdParamValidator]>

// article モジュール専用のハンドラーファクトリー。
// 「article_id を受けてセッションユーザーの記事状態を変更する」形に限定する。
// 対象をモジュール内へ絞りコンテキスト型を具象（articleIdParamValidator）に固定することで、
// 汎用ファクトリーで必要だった型アサーションと Hono client の型推論の破れを避ける
export function createArticleActionHandler<TOutput>(
  execute: (
    useCase: ArticleUseCase,
    activeUserId: bigint,
    articleId: bigint,
  ) => Promise<Result<TOutput, Error>>,
) {
  return async (c: ArticleActionContext) => {
    const logger = mustGet(c, CONTEXT_KEY.APP_LOG)
    // authenticator が先行適用される契約のため、未設定は 401 に偽装せず契約違反として顕在化させる
    const user = mustGet(c, CONTEXT_KEY.SESSION_USER)
    const { article_id } = c.req.valid('param')

    const useCase = createArticleUseCase(getRdbClient(c.env.DB))
    const result = await execute(useCase, user.activeUserId, article_id)
    if (result.isErr()) {
      handleError(result.error, logger)
    }

    // ハンドラーごとの英語ログメッセージを手書きさせないため、操作の識別はルート情報から導出する
    logger.info({
      msg: 'article action completed',
      method: c.req.method,
      route: c.req.routePath,
      activeUserId: user.activeUserId,
      articleId: article_id,
    })

    // 成功レスポンスのボディはクライアントが参照しないため、メッセージを持たせず 204 で返す
    return c.body(null, 204)
  }
}
