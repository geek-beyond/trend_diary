import { toTodayJstDateString } from '@/common/locale/date'

interface SourceSummary {
  read: number
  skip: number
}

// 失敗するのは Intl が壊れた異常環境のみで、toTodayJstDateString が送出しエラーバウンダリに委ねる
export function getTodayJst(): string {
  return toTodayJstDateString()
}

export function sumSourceSummary(sources: SourceSummary[]): SourceSummary {
  return sources.reduce(
    (acc, source) => ({
      read: acc.read + source.read,
      skip: acc.skip + source.skip,
    }),
    { read: 0, skip: 0 },
  )
}
