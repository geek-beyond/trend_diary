import { toTodayJstDateString } from '@trend-diary/common/locale/date'

interface SourceSummary {
  read: number
  skip: number
}

export function getTodayJst(): string | null {
  const result = toTodayJstDateString()
  if (result.isErr()) {
    return null
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
