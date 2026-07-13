import { toTodayJstDateString } from '@trend-diary/common/locale/date'

interface SourceSummary {
  read: number
  skip: number
}

export function getTodayJst(): string {
  const result = toTodayJstDateString()
  // 失敗するのは Intl が壊れた異常環境のみで通常は起きないため、握りつぶさずエラーバウンダリに委ねる
  if (result.isErr()) {
    throw result.error
  }
  return result.value
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
