import getRdbClient from '@trend-diary/datastore/rdb'
import { createArticleUseCase } from '@trend-diary/domain/article'
import type { Result } from 'neverthrow'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import type { ZodValidatedContext } from '@/middleware/zod-validator'
import { handleError } from '@/server/error/handle-error'
import type { articleIdParamValidator } from './handler/read-article'

type ArticleUseCase = ReturnType<typeof createArticleUseCase>

export type ArticleActionContext = ZodValidatedContext<[typeof articleIdParamValidator]>

interface ArticleActionConfig<TOutput, TStatus extends 200 | 201> {
  execute: (
    useCase: ArticleUseCase,
    activeUserId: bigint,
    articleId: bigint,
  ) => Promise<Result<TOutput, Error>>
  message: string
  logMessage: string
  statusCode: TStatus
}

// article モジュール専用のハンドラーファクトリー。
// 「article_id を受けてセッションユーザーの記事状態を変更し、メッセージを返す」形に限定する。
// 対象をモジュール内へ絞りコンテキスト型を具象（articleIdParamValidator）に固定することで、
// 汎用ファクトリーで必要だった型アサーションと Hono client の型推論の破れを避ける
export function createArticleActionHandler<TOutput, TStatus extends 200 | 201>(
  config: ArticleActionConfig<TOutput, TStatus>,
) {
  return async (c: ArticleActionContext) => {
    const logger = mustGet(c, CONTEXT_KEY.APP_LOG)
    // authenticator が先行適用される契約のため、未設定は 401 に偽装せず契約違反として顕在化させる
    const user = mustGet(c, CONTEXT_KEY.SESSION_USER)
    const { article_id } = c.req.valid('param')

    const useCase = createArticleUseCase(getRdbClient(c.env.DB))
    const result = await config.execute(useCase, user.activeUserId, article_id)
    if (result.isErr()) {
      handleError(result.error, logger)
    }

    logger.info({
      msg: config.logMessage,
      activeUserId: user.activeUserId,
      articleId: article_id,
    })

    return c.json({ message: config.message }, config.statusCode)
  }
}
