import { offsetPaginationSchema } from '@trend-diary/common/pagination'
import { z } from 'zod'
import { ARTICLE_MEDIA } from '../media'

const mediaEnum = z.enum(ARTICLE_MEDIA)

// 媒体は複数選択に対応するため、カンマ区切り文字列（例: "qiita,zenn"）・配列・単一値のいずれも ArticleMedia[] へ正規化する
const mediaListSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return undefined

  const rawList = Array.isArray(value) ? value : String(value).split(',')
  const normalized = rawList
    .map((item) => (typeof item === 'string' ? item.trim() : item))
    .filter((item) => item !== '')

  return normalized.length > 0 ? normalized : undefined
}, z.array(mediaEnum).optional())

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()

export const baseArticleSearchSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  media: mediaListSchema,
  from: dateStringSchema,
  to: dateStringSchema,
})

export const dateRangeRefine = <T extends { from?: string; to?: string }>(data: T) => {
  if (data.from && data.to) {
    return data.from <= data.to
  }
  return true
}

export const DATE_RANGE_ERROR_MESSAGE = 'fromはtoより前の日付を指定してください'

export const articleQuerySchema = baseArticleSearchSchema
  .extend({
    readStatus: z.boolean().optional(),
  })
  .merge(offsetPaginationSchema)
  .refine(dateRangeRefine, {
    message: DATE_RANGE_ERROR_MESSAGE,
  })

export type QueryParams = z.infer<typeof articleQuerySchema>
