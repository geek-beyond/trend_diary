import { createdAt } from '@trend-diary/std/schemas'
import { z } from 'zod'

// ドメインモデル用スキーマ
export const readHistorySchema = z.object({
  readHistoryId: z.bigint(),
  activeUserId: z.bigint(),
  articleId: z.bigint(),
  readAt: z.date(),
  createdAt,
})

export type ReadHistory = z.infer<typeof readHistorySchema>
