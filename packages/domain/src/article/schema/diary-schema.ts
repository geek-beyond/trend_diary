import type { OffsetPaginationResult } from '@trend-diary/std/pagination'
import { z } from 'zod'
import { ARTICLE_MEDIA } from '../media'

const mediaEnum = z.enum(ARTICLE_MEDIA)

export const diarySummarySchema = z.object({
  read: z.number().int().min(0),
  skip: z.number().int().min(0),
})

export const diarySourceSchema = z.object({
  media: mediaEnum,
  read: z.number().int().min(0),
  skip: z.number().int().min(0),
})

export const diaryReadItemSchema = z.object({
  readHistoryId: z.bigint(),
  articleId: z.bigint(),
  media: mediaEnum,
  title: z.string(),
  url: z.string().url(),
  readAt: z.date(),
})

export type DiarySummary = z.infer<typeof diarySummarySchema>
export type DiarySource = z.infer<typeof diarySourceSchema>
export type DiaryReadItem = z.infer<typeof diaryReadItemSchema>

export interface DailyDiary {
  date: string
  summary: DiarySummary
  sources: DiarySource[]
  reads: OffsetPaginationResult<DiaryReadItem>
}

export interface DailyDiaryRangeItem {
  date: string
  summary: DiarySummary
  sources: DiarySource[]
}
