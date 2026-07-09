import { addJstDays, toJstDateString } from '@trend-diary/common/locale/date'
import {
  DEFAULT_LIMIT,
  DEFAULT_MOBILE_LIMIT,
  DEFAULT_PAGE,
  offsetPaginationMobileSchema,
  offsetPaginationSchema,
} from '@trend-diary/common/pagination/schema'
import { wrapAsyncCall } from '@trend-diary/common/result'
import { type ArticleMedia, isArticleMedia } from '@trend-diary/domain/article/media'
import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'
import useSWR from 'swr'
import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import { notifyErrorUnlessSessionExpired } from '@/client/entities/auth'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'

export type MediaType = ArticleMedia | undefined
export type ReadStatusType = 'all' | 'unread'

// isRead を含む記事型(フロントエンドではarticleIdをstringに統一)
export type Article = Omit<ArticleOutput, 'articleId'> & {
  articleId: string
  isRead?: boolean
}

export const DATE_PRESETS = ['today', 'last3days', 'last7days'] as const
export type DatePresetType = (typeof DATE_PRESETS)[number]

interface Params {
  page: number
  limit: number
  media: MediaType
  readStatus: ReadStatusType
  datePreset: DatePresetType
}

export interface FilterParams {
  media: MediaType
  readStatus: ReadStatusType
  datePreset: DatePresetType
}

interface ArticlesResponse {
  data: Article[]
  page: number
  limit: number
  totalPages: number
}

const DATE_STRING_REGEX = /^\d{4}-\d{2}-\d{2}$/

const DATE_PRESET_MAP: Record<DatePresetType, number> = {
  today: 0,
  last3days: 2,
  last7days: 6,
}

const isValidDateString = (value: string | null) => !!value && DATE_STRING_REGEX.test(value)

const getDateRangeByPreset = (datePreset: DatePresetType, todayJstDateString: string) => {
  const fromDateResult = addJstDays(todayJstDateString, -DATE_PRESET_MAP[datePreset])
  if (fromDateResult.isErr()) {
    return { from: todayJstDateString, to: todayJstDateString }
  }

  return {
    from: fromDateResult.value,
    to: todayJstDateString,
  }
}

const getTodayJstDateString = (baseDate: Date): string => {
  const todayJstDateResult = toJstDateString(baseDate)
  if (todayJstDateResult.isErr()) {
    return baseDate.toISOString().slice(0, 10)
  }

  return todayJstDateResult.value
}

const parseDatePreset = (
  fromParam: string | null,
  toParam: string | null,
  todayJstDateString: string,
): DatePresetType => {
  if (!isValidDateString(fromParam) || !isValidDateString(toParam)) return 'today'

  const matchedPreset = DATE_PRESETS.find((preset) => {
    const range = getDateRangeByPreset(preset, todayJstDateString)
    return range.from === fromParam && range.to === toParam
  })

  return matchedPreset ?? 'today'
}

const applyDatePresetToSearchParams = (
  params: URLSearchParams,
  datePreset: DatePresetType,
  todayJstDateString: string,
) => {
  if (datePreset === 'today') {
    params.delete('from')
    params.delete('to')
    return
  }

  const { from, to } = getDateRangeByPreset(datePreset, todayJstDateString)
  params.set('from', from)
  params.set('to', to)
}

export default function useArticles(isLoggedIn = false) {
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useIsMobile()
  const { client, apiCall } = createSWRFetcher()

  const date = new Date()
  const todayJstDateString = getTodayJstDateString(date)

  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')
  const mediaParam = searchParams.get('media')
  const readStatusParam = searchParams.get('read_status')
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  // INFO: schemaはnullではなくundefinedを許容するため、nullの場合はundefinedに変換する
  const parseResult = (isMobile ? offsetPaginationMobileSchema : offsetPaginationSchema).safeParse({
    page: pageParam ?? undefined,
    limit: limitParam ?? undefined,
  })

  const { page: validPage, limit: validLimit } = parseResult.success
    ? parseResult.data
    : { page: DEFAULT_PAGE, limit: isMobile ? DEFAULT_MOBILE_LIMIT : DEFAULT_LIMIT }

  const params: Params = {
    page: validPage,
    limit: validLimit,
    media: mediaParam && isArticleMedia(mediaParam) ? mediaParam : undefined,
    readStatus: readStatusParam === '0' ? 'unread' : 'all',
    datePreset: parseDatePreset(fromParam, toParam, todayJstDateString),
  }

  const dateRange = getDateRangeByPreset(params.datePreset, todayJstDateString)
  const query = {
    to: dateRange.to,
    from: dateRange.from,
    page: params.page,
    limit: params.limit,
    ...(params.media && { media: params.media }),
    ...(params.readStatus === 'unread' && isLoggedIn && { read_status: '0' as const }),
  }

  const swrKey = ['api/articles', query]
  const { data, isLoading, mutate } = useSWR<ArticlesResponse>(
    swrKey,
    async () => {
      const result = await apiCall<ArticlesResponse>(() =>
        client.articles.$get({ query }, { init: { credentials: 'include' } }),
      )

      if (!result) {
        throw new Error('データの取得に失敗しました')
      }

      return {
        ...result,
        data: result.data.map((article) => ({
          ...article,
          createdAt: new Date(article.createdAt),
        })),
      }
    },
    {
      onError: (error) => {
        if (error instanceof Error) {
          notifyErrorUnlessSessionExpired(
            error,
            'エラーが発生しました。時間をおいて再度お試しください。',
          )
        } else {
          toast.error('不明なエラーが発生しました')
          // oxlint-disable-next-line no-console -- 未知のエラーのため
          console.error(error)
        }
      },
    },
  )

  // 表示中の一覧が「未読のみ」という条件と矛盾したまま残ると、フィルタが効いていないように見えるため
  const applyReadStateToCache =
    (articleId: string, isRead: boolean, shouldRemoveFromList: boolean) =>
    (current?: ArticlesResponse): ArticlesResponse => {
      // current は表示中の一覧を楽観更新する際に必ず存在するが、SWR の型上は undefined もあり得るためフォールバックを用意する
      const base = current ?? { data: [], page: params.page, limit: params.limit, totalPages: 1 }

      if (shouldRemoveFromList) {
        return {
          ...base,
          data: base.data.filter((article) => article.articleId !== articleId),
        }
      }

      return {
        ...base,
        data: base.data.map((article) =>
          article.articleId === articleId ? { ...article, isRead } : article,
        ),
      }
    }

  const updateArticleReadState = async (
    articleId: string,
    isRead: boolean,
    request: () => Promise<boolean>,
  ) => {
    const shouldRemoveFromList = params.readStatus === 'unread' && isRead
    const applyReadState = applyReadStateToCache(articleId, isRead, shouldRemoveFromList)

    // request側で失敗時のエラートーストを表示済みのため、ここでは楽観データのロールバックのみで良い
    await wrapAsyncCall(() =>
      mutate(
        async (current) => {
          const succeeded = await request()
          if (!succeeded) throw new Error('Failed to update read state')
          return applyReadState(current)
        },
        {
          optimisticData: applyReadState,
          rollbackOnError: true,
          populateCache: true,
          // 表示件数がlimit未満のまま残る（次ページの記事が繰り上がらない）のを防ぐため
          revalidate: shouldRemoveFromList,
        },
      ),
    )
  }

  const handlePageChange = (newPage: number) => {
    const newParams = new URLSearchParams(searchParams)
    if (newPage > 1) {
      newParams.set('page', newPage.toString())
    } else {
      newParams.delete('page')
    }

    setSearchParams(newParams)
  }

  const clearPageParam = (params: URLSearchParams) => {
    params.delete('page')
    return params
  }

  const toPreviousPage = (currentPage: number) => {
    const newPage = currentPage - 1

    handlePageChange(newPage)
  }

  const toNextPage = (currentPage: number) => {
    const newPage = currentPage + 1

    handlePageChange(newPage)
  }

  const handleMediaChange = (media: MediaType) => {
    const newParams = new URLSearchParams(searchParams)
    if (media) {
      newParams.set('media', media)
    } else {
      newParams.delete('media')
    }
    clearPageParam(newParams)

    setSearchParams(newParams)
  }

  const handleReadStatusChange = (readStatus: ReadStatusType) => {
    const newParams = new URLSearchParams(searchParams)
    if (readStatus === 'unread') {
      newParams.set('read_status', '0')
    } else {
      newParams.delete('read_status')
    }
    clearPageParam(newParams)

    setSearchParams(newParams)
  }

  const handleFiltersApply = ({ media, readStatus, datePreset }: FilterParams) => {
    const newParams = new URLSearchParams(searchParams)
    if (media) {
      newParams.set('media', media)
    } else {
      newParams.delete('media')
    }

    if (readStatus === 'unread') {
      newParams.set('read_status', '0')
    } else {
      newParams.delete('read_status')
    }

    applyDatePresetToSearchParams(newParams, datePreset, todayJstDateString)

    clearPageParam(newParams)
    setSearchParams(newParams)
  }

  return {
    date,
    articles: data?.data || [],
    updateArticleReadState,
    page: data?.page || params.page,
    limit: data?.limit || params.limit,
    totalPages: data?.totalPages || 1,
    isLoading,
    setSearchParams,
    toNextPage,
    toPreviousPage,
    handleMediaChange,
    handleReadStatusChange,
    handleFiltersApply,
    selectedMedia: params.media,
    selectedReadStatus: params.readStatus,
    selectedDatePreset: params.datePreset,
  }
}
