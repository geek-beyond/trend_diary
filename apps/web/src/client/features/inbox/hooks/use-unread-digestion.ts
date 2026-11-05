import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { wrapAsyncCall } from '@trend-diary/std/result'
import { useOptimistic, useRef, useTransition } from 'react'
import useSWR from 'swr'
import {
  dismissFetchError,
  notifyErrorUnlessSessionExpired,
  notifyFetchError,
  TOAST_ID,
} from '@/client/entities/session'
import { isAllMediaSelected, type SelectedMedia, useReadArticle } from '@/client/features/article'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'
import useCompletionCelebration from './use-completion-celebration'

export type Article = Omit<ArticleOutput, 'articleId'> & {
  articleId: string
}

interface UnreadDigestionResponse {
  data: Article[]
  total: number
}

type OptimisticAction =
  | { type: 'consume'; articleId: string }
  | { type: 'later'; articleId: string }

const SkipErrorMessage = 'スキップに失敗しました'
const ReadErrorMessage = '記事の更新に失敗しました'

export default function useUnreadDigestion(selectedMedia: SelectedMedia) {
  const { client, apiCall } = createSWRFetcher()
  const { markAsRead } = useReadArticle()
  const inFlightArticleIds = useRef(new Set<string>())
  const [isPending, startAction] = useTransition()
  const swrKey = ['api/articles/unread-digestion', selectedMedia]
  const {
    data,
    error,
    isLoading: isInitialLoading,
    isValidating,
    mutate,
  } = useSWR<UnreadDigestionResponse>(
    swrKey,
    () => fetchUnreadBatch(client, apiCall, selectedMedia),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      isPaused: () => inFlightArticleIds.current.size > 0,
      compare: Object.is,
      onError: (swrError) =>
        notifyFetchError(swrError, TOAST_ID.UNREAD_DIGESTION_ERROR, () => retry()),
      onSuccess: () => dismissFetchError(TOAST_ID.UNREAD_DIGESTION_ERROR),
    },
  )

  const [batch, dispatchOptimistic] = useOptimistic(data, reduceBatch)
  const { isJustCompleted, notifyCompleted } = useCompletionCelebration({
    queueLength: batch?.data.length ?? 0,
  })
  const currentArticle = batch?.data[0] ?? null

  const consume = (request: (article: Article) => Promise<boolean>, errorMessage: string) => {
    if (!canStartConsume(currentArticle, inFlightArticleIds.current, isInitialLoading)) {
      return Promise.resolve()
    }

    const article = currentArticle
    const action: OptimisticAction = { type: 'consume', articleId: article.articleId }
    inFlightArticleIds.current.add(article.articleId)

    return new Promise<void>((resolve) => {
      startAction(async () => {
        dispatchOptimistic(action)
        await settleConsume({
          request: () => request(article),
          action,
          errorMessage,
          mutate,
          inFlightArticleIds: inFlightArticleIds.current,
          notifyCompleted,
        })
        resolve()
      })
    })
  }

  const handleSkip = () =>
    consume(async (article) => {
      await apiCall(() =>
        client.articles[':article_id'].skip.$post(
          { param: { article_id: article.articleId } },
          { init: { credentials: 'include' } },
        ),
      )
      return true
    }, SkipErrorMessage)

  const handleRead = () =>
    consume((article) => {
      // ブラウザのポップアップ制限を避けるため、await より前のクリック処理内で開く
      window.open(article.url, '_blank', 'noopener,noreferrer')
      return markAsRead(article.articleId)
    }, ReadErrorMessage)

  const handleLater = () => {
    if (!currentArticle || inFlightArticleIds.current.has(currentArticle.articleId)) return
    const action: OptimisticAction = { type: 'later', articleId: currentArticle.articleId }
    startAction(() => dispatchOptimistic(action))
  }

  const isLoading = shouldShowLoading({
    isInitialLoading,
    batch,
    isPending,
    isValidating,
    hasError: !!error,
  })

  const retry = () => {
    if (inFlightArticleIds.current.size === 0) void mutate()
  }

  return {
    isLoading,
    isActionPending: isPending,
    hasError: !!error,
    retry,
    isJustCompleted,
    currentArticle,
    remainingCount: batch?.total ?? 0,
    handleSkip,
    handleRead,
    handleLater,
  }
}

function canStartConsume(
  article: Article | null,
  inFlightArticleIds: Set<string>,
  isInitialLoading: boolean,
): article is Article {
  return !!article && !inFlightArticleIds.has(article.articleId) && !isInitialLoading
}

function shouldShowLoading({
  isInitialLoading,
  batch,
  isPending,
  isValidating,
  hasError,
}: {
  isInitialLoading: boolean
  batch: UnreadDigestionResponse | undefined
  isPending: boolean
  isValidating: boolean
  hasError: boolean
}): boolean {
  return (
    isInitialLoading ||
    (batch?.data.length === 0 &&
      (isPending || isValidating || ((batch?.total ?? 0) > 0 && !hasError)))
  )
}

async function fetchUnreadBatch(
  client: ReturnType<typeof createSWRFetcher>['client'],
  apiCall: ReturnType<typeof createSWRFetcher>['apiCall'],
  selectedMedia: SelectedMedia,
): Promise<UnreadDigestionResponse> {
  const query = isAllMediaSelected(selectedMedia) ? {} : { media: selectedMedia }
  const result = await apiCall<UnreadDigestionResponse>(() =>
    client.articles['unread-digestion'].$get({ query }, { init: { credentials: 'include' } }),
  )
  if (!result) throw new Error('未読消化データの取得に失敗しました')

  return {
    data: result.data.map((article) => ({ ...article, createdAt: new Date(article.createdAt) })),
    total: result.total,
  }
}

async function settleConsume({
  request,
  action,
  errorMessage,
  mutate,
  inFlightArticleIds,
  notifyCompleted,
}: {
  request: () => Promise<boolean>
  action: OptimisticAction
  errorMessage: string
  mutate: ReturnType<typeof useSWR<UnreadDigestionResponse>>['mutate']
  inFlightArticleIds: Set<string>
  notifyCompleted: () => void
}): Promise<void> {
  const result = await wrapAsyncCall(request)
  const updatedBatch =
    result.isOk() && result.value ? await updateConfirmedBatch(action, mutate) : undefined

  if (result.isErr()) notifyErrorUnlessSessionExpired(result.error, errorMessage)
  if (updatedBatch?.total === 0) notifyCompleted()

  inFlightArticleIds.delete(action.articleId)
  if (shouldFetchNextBatch(result.isOk() && result.value, updatedBatch, inFlightArticleIds.size)) {
    // 次バッチは全操作が確定し、表示中のバッチが空になった後に取得するため
    await wrapAsyncCall(() => mutate())
  }
}

async function updateConfirmedBatch(
  action: OptimisticAction,
  mutate: ReturnType<typeof useSWR<UnreadDigestionResponse>>['mutate'],
): Promise<UnreadDigestionResponse | undefined> {
  const updateResult = await wrapAsyncCall(() =>
    mutate((current) => (current ? reduceBatch(current, action) : current), { revalidate: false }),
  )
  if (updateResult.isOk()) return updateResult.value

  notifyFetchError(updateResult.error, TOAST_ID.UNREAD_DIGESTION_ERROR, () => void mutate())
  const refreshResult = await wrapAsyncCall(() => mutate())
  return refreshResult.unwrapOr(undefined)
}

function shouldFetchNextBatch(
  succeeded: boolean,
  updatedBatch: UnreadDigestionResponse | undefined,
  otherPendingActions: number,
): boolean {
  return (
    succeeded &&
    updatedBatch?.data.length === 0 &&
    updatedBatch.total > 0 &&
    otherPendingActions === 0
  )
}

function reduceBatch(
  batch: UnreadDigestionResponse | undefined,
  action: OptimisticAction,
): UnreadDigestionResponse | undefined {
  if (!batch) return batch

  if (action.type === 'consume') {
    if (!batch.data.some((article) => article.articleId === action.articleId)) return batch
    return {
      data: batch.data.filter((article) => article.articleId !== action.articleId),
      total: Math.max(0, batch.total - 1),
    }
  }

  const article = batch.data.find((item) => item.articleId === action.articleId)
  if (!article || batch.data.length < 2) return batch
  return {
    ...batch,
    data: [...batch.data.filter((item) => item.articleId !== action.articleId), article],
  }
}
