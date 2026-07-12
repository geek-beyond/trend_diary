import { DEFAULT_PAGE, offsetPaginationSchema } from '@trend-diary/common/pagination/schema'
import { DIARY_READ_LIMIT } from '@trend-diary/domain/article/diary'
import { ARTICLE_MEDIA, type ArticleMedia } from '@trend-diary/domain/article/media'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import useSWR from 'swr'
import { notifyErrorUnlessSessionExpired } from '@/client/entities/auth'
import { getTodayJst, sumSourceSummary } from '@/client/features/diary/model/daily-summary'
import useDiaryApi from './use-diary-api'

const FETCH_ERROR_MESSAGE = 'エラーが発生しました。時間をおいて再度お試しください。'
const DIARY_ERROR_TOAST_ID = 'diary-error'

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
  const todayJst = getTodayJst()
  const hasDateResolveError = todayJst === null

  const pageParam = searchParams.get('page')
  const parseResult = offsetPaginationSchema.safeParse({
    page: pageParam ?? undefined,
    limit: DIARY_READ_LIMIT,
  })
  const page = parseResult.success ? parseResult.data.page : DEFAULT_PAGE

  const swrKey = todayJst ? (['api/articles/diary', todayJst, page] as const) : null
  const { data, error, isLoading, mutate } = useSWR(
    swrKey,
    ([, targetDate, targetPage]: readonly ['api/articles/diary', string, number]) =>
      fetchDiary(targetDate, targetPage),
    {
      // SWR のリトライ・再検証で失敗するたびにトーストが積み上がらないよう、固定 id で 1 つに集約する。
      // 再試行はトースト内のアクションに集約し、成功時にトーストを閉じる
      onError: (swrError) => {
        notifyErrorUnlessSessionExpired(swrError, FETCH_ERROR_MESSAGE, {
          id: DIARY_ERROR_TOAST_ID,
          duration: Infinity,
          action: { label: '再試行', onClick: () => retry() },
        })
      },
      onSuccess: () => toast.dismiss(DIARY_ERROR_TOAST_ID),
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
    hasError: !!error,
    retry,
    toNextPage: () => updatePage(page + 1),
    toPrevPage: () => updatePage(page - 1),
  }
}
