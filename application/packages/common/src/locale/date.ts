import { err, ok, type Result } from 'neverthrow'

const jstDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const toJstDate = (date: string) => new Date(`${date}T00:00:00+09:00`)

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

// 呼び出し元は検証済み・内部生成の日付文字列を渡す契約のため、失敗は Result で返さず
// 契約違反として送出する（toJstDateString は外部入力の検証にも使うため Result のまま）
export const addJstDays = (baseDateString: string, days: number): string => {
  const baseDate = toJstDate(baseDateString)
  if (Number.isNaN(baseDate.getTime())) {
    throw new Error(`Invalid date string: ${baseDateString}`)
  }

  // +09:00 固定の日時を UTC で日付加算すると、JST の暦日をずらした結果と一致する。
  baseDate.setUTCDate(baseDate.getUTCDate() + days)
  const shifted = toJstDateString(baseDate)
  if (shifted.isErr()) {
    throw shifted.error
  }
  return shifted.value
}
