import { createdAt } from '@trend-diary/std/schemas'
import { z } from 'zod'

export const skippedArticleSchema = z.object({
  skippedArticleId: z.bigint(),
  activeUserId: z.bigint(),
  articleId: z.bigint(),
  createdAt,
})

export type SkippedArticle = z.infer<typeof skippedArticleSchema>
