import { createdAt } from '@trend-diary/common/schemas'
import { z } from 'zod'

export const articleSchema = z.object({
  articleId: z.bigint(),
  media: z.string().max(10),
  title: z.string().max(100),
  author: z.string().max(30),
  description: z.string().max(255),
  url: z.string().url().max(2048),
  createdAt,
})

export const articleWithReadStatusSchema = articleSchema.extend({
  isRead: z.boolean(),
})

export const articleWithOptionalReadStatusSchema = articleSchema.extend({
  isRead: z.boolean().optional(),
})

// 未読消化は1件ずつ消化するため一覧はLIMITで分割取得する。
// 残件表示と「全消化したか」の判定にはバッチ件数ではなく未読総数が要るため併せて返す
export interface UnreadDigestionResult {
  articles: z.infer<typeof articleSchema>[]
  total: number
}

export type Article = z.infer<typeof articleSchema>
export type ArticleInput = Omit<z.infer<typeof articleSchema>, 'articleId' | 'createdAt'>
export type ArticleOutput = z.output<typeof articleSchema>
export type ArticleWithReadStatus = z.infer<typeof articleWithReadStatusSchema>
export type ArticleWithReadStatusOutput = z.output<typeof articleWithReadStatusSchema>
export type ArticleWithOptionalReadStatus = z.infer<typeof articleWithOptionalReadStatusSchema>
export type ArticleWithOptionalReadStatusOutput = z.output<
  typeof articleWithOptionalReadStatusSchema
>
