import { DIARY_DAYS, DIARY_READ_LIMIT } from '@trend-diary/domain/article/diary'
import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import { addJstDays, toJstDateString } from '@trend-diary/std/locale/date'
import { DEFAULT_PAGE, offsetPaginationSchema } from '@trend-diary/std/pagination/schema'
import { useSearchParams } from 'react-router'
import useSWR from 'swr'
import { dismissFetchError, notifyFetchError, TOAST_ID } from '@/client/entities/session'
import { sumSourceSummary } from '@/client/features/diary/model/daily-summary'
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
  Array.from({ length: DIARY_DAYS }, (_, index) => addJstDays(todayJst, -(DIARY_DAYS - 1 - index)))

export default function useAnalytics() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { fetchDiary, fetchDiaryRange } = useDiaryApi()

  const todayJst = toJstDateString(new Date())

  const availableDates = buildAvailableDates(todayJst)
  const dateParam = searchParams.get('date')
  const pageParam = searchParams.get('page')

  const selectedDate = dateParam && availableDates.includes(dateParam) ? dateParam : null

  const parseResult = offsetPaginationSchema.safeParse({
    page: pageParam ?? undefined,
    limit: DIARY_READ_LIMIT,
  })
  const page = parseResult.success ? parseResult.data.page : DEFAULT_PAGE

  const summaryKey = ['api/articles/diary-summary', ...availableDates]
  const {
    data: summaryRangeData,
    error: summaryError,
    isLoading: isSummaryLoading,
    mutate: mutateSummary,
  } = useSWR<SummaryRangeData>(
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
    {
      onError: (error) => notifyFetchError(error, TOAST_ID.DIARY_ANALYTICS_ERROR, () => retry()),
      onSuccess: () => dismissFetchError(TOAST_ID.DIARY_ANALYTICS_ERROR),
    },
  )

  const swrKey: ['api/articles/diary', string, number] | null = selectedDate
    ? ['api/articles/diary', selectedDate, page]
    : null
  const {
    data,
    error: dailyError,
    isLoading,
    mutate: mutateDaily,
  } = useSWR<DiaryResponse>(
    swrKey,
    ([, date, currentPage]: ['api/articles/diary', string, number]) =>
      fetchDiary(date, currentPage),
    {
      onError: (error) => notifyFetchError(error, TOAST_ID.DIARY_ANALYTICS_ERROR, () => retry()),
      // 週次・日次のどちらかが成功したらトーストを閉じる。まだ失敗中の側があれば
      // SWR のエラーリトライで再度 onError が発火し、同一 id のトーストが出直る
      onSuccess: () => dismissFetchError(TOAST_ID.DIARY_ANALYTICS_ERROR),
    },
  )

  const retry = () => {
    void mutateSummary()
    void mutateDaily()
  }

  const view = resolveOrFallback(data, summaryRangeData, availableDates, page)

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
    summaryRange: view.summaryRange,
    weeklySummary: view.weeklySummary,
    dailySummary: view.dailySummary,
    sources: view.sources,
    reads: view.reads,
    readPagination: view.readPagination,
    isLoading: isLoading || isSummaryLoading,
    hasError: !!summaryError || !!dailyError,
    retry,
    selectDate,
    clearSelectedDate,
    toNextPage: () => updatePage(page + 1),
    toPrevPage: () => updatePage(page - 1),
  }
}

function resolveOrFallback(
  data: DiaryResponse | undefined,
  summaryRangeData: SummaryRangeData | undefined,
  availableDates: string[],
  page: number,
) {
  const summaryRange = resolveSummaryRange(summaryRangeData, availableDates)
  const weeklySources = resolveWeeklySources(summaryRangeData)

  return {
    reads: data?.reads.data.map((read) => ({ ...read, readAt: new Date(read.readAt) })) ?? [],
    summaryRange,
    weeklySummary: sumSourceSummary(summaryRange),
    dailySummary: data ? sumSourceSummary(data.sources) : { read: 0, skip: 0 },
    sources: data?.sources ?? weeklySources,
    readPagination: data?.reads ?? {
      data: [],
      page,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
  }
}

function resolveSummaryRange(
  summaryRangeData: SummaryRangeData | undefined,
  availableDates: string[],
): DiaryPoint[] {
  return summaryRangeData?.points ?? availableDates.map((date) => ({ date, read: 0, skip: 0 }))
}

function resolveWeeklySources(summaryRangeData: SummaryRangeData | undefined): DiarySource[] {
  return (
    summaryRangeData?.weeklySources ?? ARTICLE_MEDIA.map((media) => ({ media, read: 0, skip: 0 }))
  )
}

function buildEmptyRangeItem(date: string): DiaryRangeItemResponse {
  return {
    date,
    summary: { read: 0, skip: 0 },
    sources: ARTICLE_MEDIA.map((media) => ({ media, read: 0, skip: 0 })),
  }
}
