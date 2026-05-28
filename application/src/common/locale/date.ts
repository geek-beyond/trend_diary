import { err, ok, type Result } from 'neverthrow'
import { z } from 'zod'

const dateSchema = z.union([z.string().datetime(), z.date()])
const jstDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const toJstDate = (date: string) => new Date(`${date}T00:00:00+09:00`)

export const toTodayJstDateString = (): Result<string, Error> => toJstDateString(new Date())

const getJstDateParts = (
  rawDate: Date,
): Result<{ year: string; month: string; day: string }, Error> => {
  if (Number.isNaN(rawDate.getTime())) {
    return err(new Error('無効な日付です'))
  }

  const jstParts = jstDateFormatter.formatToParts(rawDate)
  const year = jstParts.find((part) => part.type === 'year')?.value
  const month = jstParts.find((part) => part.type === 'month')?.value
  const day = jstParts.find((part) => part.type === 'day')?.value

  if (!year || !month || !day) {
    return err(new Error('JST日付の取得に失敗しました'))
  }

  return ok({ year, month, day })
}

export const toJstDateString = (rawDate: Date): Result<string, Error> => {
  const jstDatePartsResult = getJstDateParts(rawDate)
  if (jstDatePartsResult.isErr()) {
    return err(jstDatePartsResult.error)
  }

  const { year, month, day } = jstDatePartsResult.value
  return ok(`${year}-${month}-${day}`)
}

export const addJstDays = (baseDateString: string, days: number): Result<string, Error> => {
  const baseDate = toJstDate(baseDateString)
  if (Number.isNaN(baseDate.getTime())) {
    return err(new Error(`不正な日付文字列です: ${baseDateString}`))
  }

  // +09:00 固定の日時を UTC で日付加算すると、JST の暦日をずらした結果と一致する。
  baseDate.setUTCDate(baseDate.getUTCDate() + days)
  return toJstDateString(baseDate)
}

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
