import { offsetPaginationSchema } from '@trend-diary/common/pagination'
import { z } from 'zod'
import { ARTICLE_MEDIA } from '../media'

const mediaEnum = z.enum(ARTICLE_MEDIA)

const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional()

export const baseArticleSearchSchema = z.object({
  title: z.string().optional(),
  author: z.string().optional(),
  media: mediaEnum.optional(),
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
