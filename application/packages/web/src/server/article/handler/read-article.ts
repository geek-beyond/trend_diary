import { handleError } from '@trend-diary/common/errors'
import getRdbClient from '@trend-diary/datastore/rdb'
import { createArticleUseCase } from '@trend-diary/domain/article'
import { z } from 'zod'
import CONTEXT_KEY from '@/middleware/context'
import { ZodValidatedParamJsonContext } from '@/middleware/zod-validator'

// API用スキーマ
export const createReadHistoryApiSchema = z.object({
  read_at: z.string().datetime(),
})

export const articleIdParamSchema = z.object({
  article_id: z
    .string()
    .min(1)
    .regex(/^\d+$/, { message: 'article_id must be a valid number' })
    .transform((val) => BigInt(val)),
})

export type ArticleIdParam = z.output<typeof articleIdParamSchema>

// param + json の同時指定ではファクトリーの戻り値型を Hono client が解決できず json が欠落するため、
// 従来パターンで検証済みコンテキストを明示し、c.json の TypedResponse で RPC 型推論を保つ
export default async function readArticle(
  c: ZodValidatedParamJsonContext<typeof articleIdParamSchema, typeof createReadHistoryApiSchema>,
) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const user = c.get(CONTEXT_KEY.SESSION_USER)
  const { article_id } = c.req.valid('param')
  const { read_at } = c.req.valid('json')

  const rdb = getRdbClient(c.env.DB)
  const useCase = createArticleUseCase(rdb)

  const result = await useCase.createReadHistory(user.activeUserId, article_id, new Date(read_at))
  if (result.isErr()) {
    throw handleError(result.error, logger)
  }

  logger.info({
    msg: 'Read history created successfully',
    activeUserId: user.activeUserId,
    articleId: article_id,
  })

  return c.json({ message: '記事を既読にしました' }, 201)
}
