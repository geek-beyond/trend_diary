import { DIARY_READ_LIMIT } from '@trend-diary/domain/article/diary'
import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import { toJstDateString } from '@trend-diary/std/locale/date'
import { DEFAULT_PAGE, offsetPaginationSchema } from '@trend-diary/std/pagination/schema'
import { useSearchParams } from 'react-router'
import useSWR from 'swr'
import { dismissFetchError, notifyFetchError, TOAST_ID } from '@/client/entities/session'
import { sumSourceSummary } from '@/client/features/diary/model/daily-summary'
import useDiaryApi from './use-diary-api'

interface DiaryReadItem {
  readHistoryId: string
  articleId: string
  media: ArticleMedia
  title: string
  url: string
  readAt: Date
}

const emptySources = ARTICLE_MEDIA.map((media) => ({ media, read: 0, skip: 0 }))

export default function useDiary() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { fetchDiary } = useDiaryApi()
  const todayJst = toJstDateString(new Date())

  const pageParam = searchParams.get('page')
  const parseResult = offsetPaginationSchema.safeParse({
    page: pageParam ?? undefined,
    limit: DIARY_READ_LIMIT,
  })
  const page = parseResult.success ? parseResult.data.page : DEFAULT_PAGE

  const swrKey = ['api/articles/diary', todayJst, page] as const
  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    ([, targetDate, targetPage]: readonly ['api/articles/diary', string, number]) =>
      fetchDiary(targetDate, targetPage),
    {
      onError: (swrError) => notifyFetchError(swrError, TOAST_ID.DIARY_ERROR, () => retry()),
      onSuccess: () => dismissFetchError(TOAST_ID.DIARY_ERROR),
    },
  )

  const retry = () => {
    void mutate()
  }

  const reads: DiaryReadItem[] =
    data?.reads.data.map((read) => ({ ...read, readAt: new Date(read.readAt) })) ?? []
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

  return {
    todayJst,
    dailySummary,
    sources: data?.sources ?? emptySources,
    reads,
    readPagination: data?.reads ?? {
      data: [],
      page,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    },
    isLoading,
    hasError: !!error,
    retry,
    toNextPage: () => updatePage(page + 1),
    toPrevPage: () => updatePage(page - 1),
  }
}
