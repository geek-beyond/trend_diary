import { createArticleUseCase } from '@trend-diary/domain/article'
import { z } from 'zod'
import {
  type AuthenticatedRequestContext,
  createAuthenticatedApiHandler,
} from '@/server/handler/factory'

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

export type CreateReadHistoryApiInput = z.input<typeof createReadHistoryApiSchema>
export type ArticleIdParam = z.output<typeof articleIdParamSchema>

export default createAuthenticatedApiHandler({
  createUseCase: createArticleUseCase,
  execute: async (
    useCase,
    context: AuthenticatedRequestContext<ArticleIdParam, CreateReadHistoryApiInput>,
  ) => {
    return useCase.createReadHistory(
      context.user.activeUserId,
      context.param.article_id,
      new Date(context.json.read_at),
    )
  },
  transform: () => ({ message: '記事を既読にしました' }),
  logMessage: 'Read history created successfully',
  logPayload: (_result, context) => ({
    activeUserId: context.user.activeUserId,
    articleId: context.param.article_id,
  }),
  statusCode: 201,
})
