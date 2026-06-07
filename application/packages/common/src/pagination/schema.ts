import { z } from 'zod'

export const DEFAULT_LIMIT = 20
export const DEFAULT_MOBILE_LIMIT = 10
export const DEFAULT_PAGE = 1
export const MIN_LIMIT = 1
export const MAX_LIMIT = 100
export const MAX_PAGE = 10

const numericString = z.string().pipe(z.coerce.number())

const page = z
  .union([z.number(), numericString])
  .optional()
  .default(DEFAULT_PAGE)
  .pipe(z.number().int().min(1).max(MAX_PAGE))

const limit = z
  .union([z.number(), numericString])
  .optional()
  .default(DEFAULT_LIMIT)
  .pipe(z.number().min(MIN_LIMIT).max(MAX_LIMIT))

const mobileLimit = z
  .union([z.number(), numericString])
  .optional()
  .default(DEFAULT_MOBILE_LIMIT)
  .pipe(z.number().min(MIN_LIMIT).max(MAX_LIMIT))

export const offsetPaginationSchema = z.object({
  page,
  limit,
})

export const offsetPaginationMobileSchema = offsetPaginationSchema.extend({
  limit: mobileLimit,
})

export type OffsetPaginationParams = z.infer<typeof offsetPaginationSchema>
export type OffsetPaginationMobileParams = z.infer<typeof offsetPaginationMobileSchema>
