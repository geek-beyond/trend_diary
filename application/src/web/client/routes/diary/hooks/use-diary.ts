import { DEFAULT_PAGE, offsetPaginationSchema } from '@trend-diary/common/pagination/schema'
import { DIARY_READ_LIMIT } from '@trend-diary/domain/article/diary'
import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import { useSearchParams } from 'react-router'
import useSWR from 'swr'
import { getTodayJst, sumSourceSummary } from '@/web/client/features/diary/diary-shared'
import useDiaryApi from './use-diary-api'

type DiaryReadItem = {
  readHistoryId: string
  articleId: string
  media: ArticleMedia
  title: string
  url: string
  readAt: Date
}

const emptySources = ARTICLE_MEDIA.map((media) => ({ media, read: 0, skip: 0 }))

export default function useDiary(enabled: boolean) {
  const [searchParams, setSearchParams] = useSearchParams()
  const { fetchDiary } = useDiaryApi()
  const todayJst = getTodayJst()
  const hasDateResolveError = todayJst === null

  const pageParam = searchParams.get('page')
  const parseResult = offsetPaginationSchema.safeParse({
    page: pageParam ?? undefined,
    limit: DIARY_READ_LIMIT,
  })
  const page = parseResult.success ? parseResult.data.page : DEFAULT_PAGE

  const swrKey = enabled && todayJst ? (['api/articles/diary', todayJst, page] as const) : null
  const { data, isLoading } = useSWR(swrKey, ([, targetDate, targetPage]) =>
    fetchDiary(targetDate, targetPage),
  )

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
    dateResolveError: hasDateResolveError,
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
    toNextPage: () => updatePage(page + 1),
    toPrevPage: () => updatePage(page - 1),
  }
}
