import { addJstDays } from '@trend-diary/common/locale/date'
import { DEFAULT_PAGE, offsetPaginationSchema } from '@trend-diary/common/pagination/schema'
import { DIARY_DAYS, DIARY_READ_LIMIT } from '@trend-diary/domain/article/diary'
import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import { useMemo } from 'react'
import { useSearchParams } from 'react-router'
import useSWR from 'swr'
import { getTodayJst, sumSourceSummary } from '@/client/features/diary/daily-summary'
import useDiaryApi, {
  type DiaryRangeItemResponse,
  type DiaryResponse,
  type DiarySource,
} from './use-diary-api'

interface DiaryPoint {
  date: string
  read: number
  skip: number
}

interface SummaryRangeData {
  points: DiaryPoint[]
  weeklySources: DiarySource[]
}

const buildAvailableDates = (todayJst: string) =>
  Array.from({ length: DIARY_DAYS }, (_, index) => {
    const dateResult = addJstDays(todayJst, -(DIARY_DAYS - 1 - index))
    if (dateResult.isErr()) return todayJst
    return dateResult.value
  })

export default function useAnalytics(enabled: boolean) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { fetchDiary, fetchDiaryRange } = useDiaryApi()

  const todayJst = getTodayJst()
  const hasDateResolveError = todayJst === null
  const availableDates = useMemo(() => (todayJst ? buildAvailableDates(todayJst) : []), [todayJst])
  const dateParam = searchParams.get('date')
  const pageParam = searchParams.get('page')

  const selectedDate = dateParam && availableDates.includes(dateParam) ? dateParam : null

  const parseResult = offsetPaginationSchema.safeParse({
    page: pageParam ?? undefined,
    limit: DIARY_READ_LIMIT,
  })
  const page = parseResult.success ? parseResult.data.page : DEFAULT_PAGE

  const summaryKey =
    enabled && availableDates.length > 0 ? ['api/articles/diary-summary', ...availableDates] : null
  const { data: summaryRangeData, isLoading: isSummaryLoading } = useSWR<SummaryRangeData>(
    summaryKey,
    async () => {
      const from = availableDates[0]
      const to = availableDates[availableDates.length - 1]
      const responses = await fetchDiaryRange(from, to)
      const responseMap = new Map(responses.map((response) => [response.date, response] as const))
      const normalizedResponses = availableDates.map(
        (date): DiaryRangeItemResponse => responseMap.get(date) ?? buildEmptyRangeItem(date),
      )
      const points = normalizedResponses.map((response) => ({
        date: response.date,
        read: response.summary.read,
        skip: response.summary.skip,
      }))

      const sourceMap: Record<ArticleMedia, { read: number; skip: number }> = {
        qiita: { read: 0, skip: 0 },
        zenn: { read: 0, skip: 0 },
        hatena: { read: 0, skip: 0 },
      }

      for (const response of normalizedResponses) {
        for (const source of response.sources) {
          sourceMap[source.media].read += source.read
          sourceMap[source.media].skip += source.skip
        }
      }

      return {
        points,
        weeklySources: ARTICLE_MEDIA.map((media) => ({
          media,
          read: sourceMap[media].read,
          skip: sourceMap[media].skip,
        })),
      }
    },
  )

  const swrKey: ['api/articles/diary', string, number] | null =
    enabled && selectedDate ? ['api/articles/diary', selectedDate, page] : null
  const { data, isLoading } = useSWR<DiaryResponse>(
    swrKey,
    ([, date, currentPage]: ['api/articles/diary', string, number]) =>
      fetchDiary(date, currentPage),
  )

  const reads = data?.reads.data.map((read) => ({ ...read, readAt: new Date(read.readAt) })) ?? []
  const normalizedSummaryRange =
    summaryRangeData?.points ?? availableDates.map((date) => ({ date, read: 0, skip: 0 }))
  const weeklySummary = sumSourceSummary(normalizedSummaryRange)
  const weeklySources =
    summaryRangeData?.weeklySources ?? ARTICLE_MEDIA.map((media) => ({ media, read: 0, skip: 0 }))
  const dailySummary = data ? sumSourceSummary(data.sources) : { read: 0, skip: 0 }

  const updatePage = (nextPage: number) => {
    const nextParams = new URLSearchParams(searchParams)
    if (nextPage <= 1) {
      nextParams.delete('page')
    } else {
      nextParams.set('page', String(nextPage))
    }
    setSearchParams(nextParams)
  }

  const selectDate = (date: string) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('date', date)
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  const clearSelectedDate = () => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('date')
    nextParams.delete('page')
    setSearchParams(nextParams)
  }

  return {
    selectedDate,
    summaryRange: normalizedSummaryRange,
    weeklySummary,
    dailySummary,
    sources: data?.sources ?? weeklySources,
    reads,
    readPagination: data?.reads ?? {
      data: [],
      page,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    dateResolveError: hasDateResolveError,
    isLoading: isLoading || isSummaryLoading,
    selectDate,
    clearSelectedDate,
    toNextPage: () => updatePage(page + 1),
    toPrevPage: () => updatePage(page - 1),
  }
}

function buildEmptyRangeItem(date: string): DiaryRangeItemResponse {
  return {
    date,
    summary: { read: 0, skip: 0 },
    sources: ARTICLE_MEDIA.map((media) => ({ media, read: 0, skip: 0 })),
  }
}
