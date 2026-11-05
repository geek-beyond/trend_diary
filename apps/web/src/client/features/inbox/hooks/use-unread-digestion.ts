import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { wrapAsyncCall } from '@trend-diary/std/result'
import { startTransition, useEffect, useOptimistic, useRef, useState } from 'react'
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

interface DigestionState {
  queue: Article[]
  remaining: number
}

type OptimisticAction =
  | { type: 'consume'; articleId: string }
  | { type: 'later'; articleId: string }

const SkipErrorMessage = 'スキップに失敗しました'
const ReadErrorMessage = '記事の更新に失敗しました'
const initialState: DigestionState = { queue: [], remaining: 0 }

export default function useUnreadDigestion(selectedMedia: SelectedMedia) {
  const { client, apiCall } = createSWRFetcher()
  const { markAsRead } = useReadArticle()
  const [syncedBatch, setSyncedBatch] = useState<UnreadDigestionResponse>()
  const [state, setState] = useState<DigestionState>(initialState)
  const [pendingActionCount, setPendingActionCount] = useState(0)
  const queueRef = useRef<Article[]>([])
  const remainingRef = useRef(0)
  const inFlightArticleIds = useRef(new Set<string>())
  const swrKey = ['api/articles/unread-digestion', selectedMedia]
  const {
    data,
    error,
    isLoading: isInitialLoading,
    isValidating,
    mutate,
  } = useSWR<UnreadDigestionResponse>(
    swrKey,
    async () => {
      const query = isAllMediaSelected(selectedMedia) ? {} : { media: selectedMedia }
      const result = await apiCall<UnreadDigestionResponse>(() =>
        client.articles['unread-digestion'].$get({ query }, { init: { credentials: 'include' } }),
      )

      if (!result) {
        throw new Error('未読消化データの取得に失敗しました')
      }

      return {
        data: result.data.map((article) => ({
          ...article,
          createdAt: new Date(article.createdAt),
        })),
        total: result.total,
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      isPaused: () => inFlightArticleIds.current.size > 0,
      // 明示的な再試行で同一バッチが返ってもキューを同期し直すため
      compare: Object.is,
      onError: (swrError) =>
        notifyFetchError(swrError, TOAST_ID.UNREAD_DIGESTION_ERROR, () => retry()),
      onSuccess: () => dismissFetchError(TOAST_ID.UNREAD_DIGESTION_ERROR),
    },
  )

  if (data && data !== syncedBatch) {
    setSyncedBatch(data)
    setState({ queue: data.data, remaining: data.total })
  }

  useEffect(() => {
    if (!data || data !== syncedBatch) return
    queueRef.current = data.data
    remainingRef.current = data.total
  }, [data, syncedBatch])

  const [optimisticState, dispatchOptimistic] = useOptimistic(state, reduceDigestionState)
  const { isJustCompleted, notifyCompleted } = useCompletionCelebration({
    queueLength: optimisticState.queue.length,
  })
  const currentArticle = optimisticState.queue[0] ?? null

  const consume = (request: (article: Article) => Promise<boolean>, errorMessage: string) => {
    if (
      !currentArticle ||
      inFlightArticleIds.current.has(currentArticle.articleId) ||
      isInitialLoading
    ) {
      return Promise.resolve()
    }

    const article = currentArticle
    const action: OptimisticAction = { type: 'consume', articleId: article.articleId }
    inFlightArticleIds.current.add(article.articleId)
    setPendingActionCount(inFlightArticleIds.current.size)

    return new Promise<void>((resolve) => {
      startTransition(async () => {
        dispatchOptimistic(action)
        const result = await wrapAsyncCall(() => request(article))

        if (result.isErr()) {
          notifyErrorUnlessSessionExpired(result.error, errorMessage)
        } else if (result.value) {
          queueRef.current = reduceDigestionState(
            { queue: queueRef.current, remaining: remainingRef.current },
            action,
          ).queue
          remainingRef.current = Math.max(0, remainingRef.current - 1)
          setState((previous) => reduceDigestionState(previous, action))
          if (remainingRef.current === 0) notifyCompleted()
        }

        inFlightArticleIds.current.delete(article.articleId)
        setPendingActionCount(inFlightArticleIds.current.size)

        if (
          result.isOk() &&
          result.value &&
          queueRef.current.length === 0 &&
          remainingRef.current > 0
        ) {
          // 残件は残っているが今のバッチを消化した後だけ、次のバッチを取得するため
          await wrapAsyncCall(() => mutate())
        }
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
    startTransition(() => {
      dispatchOptimistic(action)
      queueRef.current = reduceDigestionState(
        { queue: queueRef.current, remaining: remainingRef.current },
        action,
      ).queue
      setState((previous) => reduceDigestionState(previous, action))
    })
  }

  const isLoading =
    isInitialLoading ||
    (optimisticState.queue.length === 0 &&
      (pendingActionCount > 0 || isValidating || (optimisticState.remaining > 0 && !error)))

  const retry = () => {
    if (inFlightArticleIds.current.size === 0) void mutate()
  }

  return {
    isLoading,
    pendingActionCount,
    hasError: !!error,
    retry,
    isJustCompleted,
    currentArticle,
    remainingCount: optimisticState.remaining,
    handleSkip,
    handleRead,
    handleLater,
  }
}

function reduceDigestionState(state: DigestionState, action: OptimisticAction): DigestionState {
  if (action.type === 'consume') {
    if (!state.queue.some((article) => article.articleId === action.articleId)) return state
    return {
      queue: state.queue.filter((article) => article.articleId !== action.articleId),
      remaining: Math.max(0, state.remaining - 1),
    }
  }

  const article = state.queue.find((item) => item.articleId === action.articleId)
  if (!article || state.queue.length < 2) return state
  return {
    ...state,
    queue: [...state.queue.filter((item) => item.articleId !== action.articleId), article],
  }
}
