import { toJstDate } from '@trend-diary/std/locale'
import { z } from 'zod'

const dateSchema = z.union([z.string().datetime(), z.date()])

export const toJaDateString = (value: string | Date): string => {
  const parseResult = dateSchema.safeParse(value)
  if (!parseResult.success) return ''

  const date = new Date(value)
  return date.toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo' })
}

export const toJaTimeString = (rawDate: Date): string => {
  if (Number.isNaN(rawDate.getTime())) {
    return ''
  }

  return rawDate.toLocaleTimeString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export const formatSummaryDateTick = (value: string | number): string => {
  if (typeof value !== 'string') {
    return String(value)
  }

  const date = toJstDate(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleDateString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    month: 'short',
    day: 'numeric',
  })
}
