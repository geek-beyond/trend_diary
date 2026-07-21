import { isArticleMedia } from '@trend-diary/domain/article/media'
import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { addJstDays, toJstDateString } from '@trend-diary/std/locale/date'
import {
  DEFAULT_LIMIT,
  DEFAULT_MOBILE_LIMIT,
  DEFAULT_PAGE,
  offsetPaginationMobileSchema,
  offsetPaginationSchema,
} from '@trend-diary/std/pagination/schema'
import { wrapAsyncCall } from '@trend-diary/std/result'
import { useLocation, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import useSWR from 'swr'
import { useIsMobile } from '@/client/components/shadcn/hooks/use-mobile'
import { dismissFetchError, notifyFetchError, TOAST_ID } from '@/client/entities/session'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'
import { ALL_MEDIA, isAllMediaSelected, type SelectedMedia } from '../model/media-selection'

export { ALL_MEDIA, isAllMediaSelected, type SelectedMedia }
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
  media: SelectedMedia
  readStatus: ReadStatusType
  datePreset: DatePresetType
}

export interface FilterParams {
  media: SelectedMedia
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

const parseSelectedMedia = (mediaParams: string[]): SelectedMedia => {
  const selected = [...new Set(mediaParams.filter(isArticleMedia))]
  return selected.length > 0 ? selected : ALL_MEDIA
}

const getDateRangeByPreset = (datePreset: DatePresetType, todayJstDateString: string) => ({
  from: addJstDays(todayJstDateString, -DATE_PRESET_MAP[datePreset]),
  to: todayJstDateString,
})

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

// page=1 は既定ページのためクエリから除き URL を素にする。1 より大きいときだけ page を持たせる
const applyPageToSearchParams = (params: URLSearchParams, targetPage: number) => {
  if (targetPage > 1) {
    params.set('page', targetPage.toString())
  } else {
    params.delete('page')
  }
}

const clearPageParam = (params: URLSearchParams): void => {
  params.delete('page')
}

export default function useArticles(isLoggedIn = false) {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const isMobile = useIsMobile()
  const { client, apiCall } = createSWRFetcher()

  const date = new Date()
  const todayJstDateString = toJstDateString(date)

  const pageParam = searchParams.get('page')
  const limitParam = searchParams.get('limit')
  const mediaParams = searchParams.getAll('media')
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
    media: parseSelectedMedia(mediaParams),
    readStatus: readStatusParam === '0' ? 'unread' : 'all',
    datePreset: parseDatePreset(fromParam, toParam, todayJstDateString),
  }

  const dateRange = getDateRangeByPreset(params.datePreset, todayJstDateString)
  const query = buildArticlesQuery(params, dateRange, isLoggedIn)

  const swrKey = ['api/articles', query]
  const { data, error, isLoading, mutate } = useSWR<ArticlesResponse>(
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
      onError: (swrError) => {
        if (swrError instanceof Error) {
          notifyFetchError(swrError, TOAST_ID.ARTICLES_ERROR, () => retry())
        } else {
          // fetcher は Error 系を throw するため通常到達しないが、想定外の値に備えたフォールバック
          toast.error('不明なエラーが発生しました', {
            id: TOAST_ID.ARTICLES_ERROR,
            duration: Infinity,
            action: { label: '再試行', onClick: () => retry() },
          })
          // oxlint-disable-next-line no-console -- 未知のエラーのため
          console.error(swrError)
        }
      },
      onSuccess: () => dismissFetchError(TOAST_ID.ARTICLES_ERROR),
    },
  )

  const retry = () => {
    void mutate()
  }

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
    applyPageToSearchParams(newParams, newPage)

    setSearchParams(newParams)
  }

  // 検索エンジンがページ送りをたどれるよう、前へ／次へに実体のある href を持たせるためのリンク先を組み立てる。
  // SPA 遷移（setSearchParams）後の URL と一致するよう、handlePageChange と同じ page 付与ルールを使う
  const buildPagePath = (targetPage: number) => {
    const newParams = new URLSearchParams(searchParams)
    applyPageToSearchParams(newParams, targetPage)

    const queryString = newParams.toString()
    return queryString ? `${location.pathname}?${queryString}` : location.pathname
  }

  const toPreviousPage = (currentPage: number) => {
    const newPage = currentPage - 1

    handlePageChange(newPage)
  }

  const toNextPage = (currentPage: number) => {
    const newPage = currentPage + 1

    handlePageChange(newPage)
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
    newParams.delete('media')
    if (!isAllMediaSelected(media)) {
      media.forEach((value) => newParams.append('media', value))
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

  const view = resolveOrFallback(data, params)

  return {
    date,
    articles: view.articles,
    updateArticleReadState,
    page: view.page,
    prevPageHref: buildPagePath(view.page - 1),
    nextPageHref: buildPagePath(view.page + 1),
    limit: view.limit,
    totalPages: view.totalPages,
    isLoading,
    hasError: !!error,
    retry,
    setSearchParams,
    toNextPage,
    toPreviousPage,
    handleReadStatusChange,
    handleFiltersApply,
    selectedMedia: params.media,
    selectedReadStatus: params.readStatus,
    selectedDatePreset: params.datePreset,
  }
}

function buildArticlesQuery(
  params: Params,
  dateRange: { from: string; to: string },
  isLoggedIn: boolean,
) {
  return {
    to: dateRange.to,
    from: dateRange.from,
    page: params.page,
    limit: params.limit,
    ...(!isAllMediaSelected(params.media) && { media: params.media }),
    ...(params.readStatus === 'unread' && isLoggedIn && { read_status: '0' as const }),
  }
}

interface ArticlesView {
  articles: Article[]
  page: number
  limit: number
  totalPages: number
}

function resolveOrFallback(data: ArticlesResponse | undefined, params: Params): ArticlesView {
  return {
    articles: data?.data || [],
    page: data?.page || params.page,
    limit: data?.limit || params.limit,
    totalPages: data?.totalPages || 1,
  }
}
