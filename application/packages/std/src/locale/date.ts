import { assert } from '../contract'

const jstDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export const toJstDate = (date: string) => new Date(`${date}T00:00:00+09:00`)

// 呼び出し元は妥当な Date を渡す契約のため、失敗は Result で返さず契約違反として送出する。
// 外部入力の妥当性判定は、呼び出し側が toJstDate の結果を NaN チェックしてから渡す
export const toJstDateString = (rawDate: Date): string => {
  assert(!Number.isNaN(rawDate.getTime()), 'Invalid date')

  const jstParts = jstDateFormatter.formatToParts(rawDate)
  const year = jstParts.find((part) => part.type === 'year')?.value
  const month = jstParts.find((part) => part.type === 'month')?.value
  const day = jstParts.find((part) => part.type === 'day')?.value

  assert(year && month && day, 'Failed to resolve JST date parts')

  return `${year}-${month}-${day}`
}

// 呼び出し元は検証済み・内部生成の日付文字列を渡す契約のため、失敗は契約違反として送出する
export const addJstDays = (baseDateString: string, days: number): string => {
  const baseDate = toJstDate(baseDateString)
  assert(!Number.isNaN(baseDate.getTime()), `Invalid date string: ${baseDateString}`)

  // +09:00 固定の日時を UTC で日付加算すると、JST の暦日をずらした結果と一致する。
  baseDate.setUTCDate(baseDate.getUTCDate() + days)
  return toJstDateString(baseDate)
}
