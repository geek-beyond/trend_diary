import { createdAt } from '@trend-diary/std/schemas'
import { z } from 'zod'
import { ARTICLE_MEDIA } from '../media'

// 各フィールドの最大長。cron の切り詰めとスキーマ検証を同一のソースに依存させ、
// 保存される実データがスキーマ検証を必ず満たすようにする
export const ARTICLE_MAX_LENGTH = {
  media: 10,
  title: 100,
  author: 30,
  description: 1024,
  url: 2048,
} as const

export const articleSchema = z.object({
  articleId: z.bigint(),
  // DB 上は任意文字列だが、書き込み経路は ARTICLE_MEDIA しか投入しない契約のため enum で表明する
  media: z.enum(ARTICLE_MEDIA),
  title: z.string().max(ARTICLE_MAX_LENGTH.title),
  author: z.string().max(ARTICLE_MAX_LENGTH.author),
  description: z.string().max(ARTICLE_MAX_LENGTH.description),
  url: z.string().url().max(ARTICLE_MAX_LENGTH.url),
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
