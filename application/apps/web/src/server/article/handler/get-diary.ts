import getRdbClient from '@trend-diary/datastore/rdb'
import { createArticleUseCase } from '@trend-diary/domain/article'
import { DIARY_DAYS, DIARY_READ_LIMIT } from '@trend-diary/domain/article/diary'
import type {
  DailyDiary,
  DailyDiaryRangeItem,
} from '@trend-diary/domain/article/schema/diary-schema'
import { addJstDays, toJstDate, toJstDateString } from '@trend-diary/std/locale/date'
import { MAX_PAGE } from '@trend-diary/std/pagination'
import { HTTPException } from 'hono/http-exception'
import { z } from 'zod'
import CONTEXT_KEY, { mustGet } from '@/middleware/context'
import zodValidator, { type ZodValidatedContext } from '@/middleware/zod-validator'
import { handleError } from '@/server/handle-error'

const DATE_STRING_REGEX = /^\d{4}-\d{2}-\d{2}$/
const DIARY_DATE_MESSAGE = 'date must be a valid JST date'
const diaryDateSchema = z
  .string()
  .regex(DATE_STRING_REGEX)
  .refine((inputDate) => {
    const parsed = toJstDate(inputDate)
    if (Number.isNaN(parsed.getTime())) return false

    return toJstDateString(parsed) === inputDate
  }, DIARY_DATE_MESSAGE)

export const diaryQuerySchema = z
  .object({
    from: diaryDateSchema,
    to: diaryDateSchema,
    page: z.coerce.number().int().min(1).max(MAX_PAGE).optional(),
  })
  .refine(
    (data) => {
      if (data.page === undefined) return true
      return data.from === data.to
    },
    {
      message: 'page is available only when from and to are the same date',
      path: ['page'],
    },
  )

export const diaryQueryValidator = zodValidator('query', diaryQuerySchema)

interface DiaryRangeResponse {
  data: Array<{
    date: string
    summary: {
      read: number
      skip: number
    }
    sources: Array<{
      media: string
      read: number
      skip: number
    }>
  }>
  reads?: {
    data: Array<{
      readHistoryId: string
      articleId: string
      media: string
      title: string
      url: string
      readAt: string
    }>
    page: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export default async function getDiary(c: ZodValidatedContext<[typeof diaryQueryValidator]>) {
  const logger = c.get(CONTEXT_KEY.APP_LOG)
  const sessionUser = mustGet(c, CONTEXT_KEY.SESSION_USER)
  const query = c.req.valid('query')
  const todayJst = toJstDateString(new Date())
  const fromDate = query.from
  const toDate = query.to

  validateDiaryDateRange(fromDate, toDate, todayJst)

  const rdb = getRdbClient(c.env.DB)
  const useCase = createArticleUseCase(rdb)

  if (query.page !== undefined) {
    const detailResult = await useCase.getDailyDiary(
      sessionUser.activeUserId,
      fromDate,
      query.page,
      DIARY_READ_LIMIT,
    )
    if (detailResult.isErr()) {
      handleError(detailResult.error, logger)
    }

    const response = toDiaryDetailResponse(detailResult.value)
    logger.info('daily diary detail retrieved successfully', {
      activeUserId: sessionUser.activeUserId,
      date: fromDate,
      page: query.page,
      read: detailResult.value.summary.read,
      skip: detailResult.value.summary.skip,
    })
    return c.json(response, 200)
  }

  const result = await useCase.getDailyDiaryRange(sessionUser.activeUserId, fromDate, toDate)
  if (result.isErr()) {
    handleError(result.error, logger)
  }
  const response = toDiaryResponse(result.value)
  logger.info('daily diary range retrieved successfully', {
    activeUserId: sessionUser.activeUserId,
    from: fromDate,
    to: toDate,
    days: response.data.length,
  })

  return c.json(response, 200)
}

function validateDiaryDateRange(fromDate: string, toDate: string, todayJst: string) {
  if (fromDate > toDate) {
    throw new HTTPException(422, {
      message: 'Invalid input',
      cause: {
        from: ['from must be less than or equal to to'],
      },
    })
  }

  const earliestDate = addJstDays(todayJst, -(DIARY_DAYS - 1))

  const causes: { from?: string[]; to?: string[] } = {}
  if (fromDate < earliestDate) {
    causes.from = [`from must be on or after ${earliestDate}`]
  }
  if (toDate > todayJst) {
    causes.to = [`to must be on or before ${todayJst}`]
  }

  if (causes.from || causes.to) {
    throw new HTTPException(422, {
      message: 'Invalid input',
      cause: causes,
    })
  }
}

function toDiaryDetailResponse(data: DailyDiary): DiaryRangeResponse {
  return {
    data: [
      {
        date: data.date,
        summary: data.summary,
        sources: data.sources,
      },
    ],
    reads: {
      data: data.reads.data.map((read) => ({
        readHistoryId: read.readHistoryId.toString(),
        articleId: read.articleId.toString(),
        media: read.media,
        title: read.title,
        url: read.url,
        readAt: read.readAt.toISOString(),
      })),
      page: data.reads.page,
      totalPages: data.reads.totalPages,
      hasNext: data.reads.hasNext,
      hasPrev: data.reads.hasPrev,
    },
  }
}

function toDiaryResponse(items: DailyDiaryRangeItem[]): DiaryRangeResponse {
  return {
    data: items.map((item) => ({
      date: item.date,
      summary: item.summary,
      sources: item.sources,
    })),
  }
}
