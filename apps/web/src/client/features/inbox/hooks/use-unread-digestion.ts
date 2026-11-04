import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { useRef, useState } from 'react'
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

const SkipErrorMessage = 'スキップに失敗しました'

export default function useUnreadDigestion(selectedMedia: SelectedMedia) {
  const { client, apiCall } = createSWRFetcher()
  const { markAsRead } = useReadArticle()
  const [queue, setQueue] = useState<Article[]>([])
  // バッチ件数ではなく未読総数。残件表示と完了判定の基準にする
  const [remaining, setRemaining] = useState(0)
  const actionInFlight = useRef(false)
  const [isActionLoading, setIsActionLoading] = useState(false)
  // 直近で同期済みのバッチ。SWR が新しい応答を返したか（参照が変わったか）の判定に使う
  const [syncedBatch, setSyncedBatch] = useState<UnreadDigestionResponse>()
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
      isPaused: () => actionInFlight.current,
      // 消化済みのローカルキューと同一応答でも、明示的な再試行では同期し直す必要があるため
      compare: Object.is,
      onError: (swrError) =>
        notifyFetchError(swrError, TOAST_ID.UNREAD_DIGESTION_ERROR, () => retry()),
      onSuccess: () => dismissFetchError(TOAST_ID.UNREAD_DIGESTION_ERROR),
    },
  )

  // 明示的なバッチ取得だけを同期し、消化中のキューを背景再検証で巻き戻さないため
  if (data && data !== syncedBatch) {
    setSyncedBatch(data)
    setRemaining(data.total)
    setQueue(data.data)
  }

  const { isJustCompleted, notifyCompleted } = useCompletionCelebration({
    queueLength: queue.length,
  })

  const currentArticle = queue[0] ?? null

  const consume = async (request: (article: Article) => Promise<boolean>) => {
    if (!currentArticle || actionInFlight.current || isActionLoading || isInitialLoading) return
    actionInFlight.current = true
    setIsActionLoading(true)
    setQueue(queue.slice(1))
    setRemaining(Math.max(0, remaining - 1))

    try {
      const succeeded = await request(currentArticle)
      if (!succeeded) {
        setQueue(queue)
        setRemaining(remaining)
      } else {
        if (remaining <= 1) notifyCompleted()
        actionInFlight.current = false
        if (queue.length === 1 && remaining > 1) {
          await mutate().catch(() => {
            // 取得エラーは SWR の通知から再試行できるため
          })
        }
      }
    } catch (actionError) {
      setQueue(queue)
      setRemaining(remaining)
      notifyErrorUnlessSessionExpired(actionError, '記事の更新に失敗しました')
    }
    actionInFlight.current = false
    setIsActionLoading(false)
  }

  const handleSkip = () =>
    consume(async (article) => {
      try {
        await apiCall(() =>
          client.articles[':article_id'].skip.$post(
            { param: { article_id: article.articleId } },
            { init: { credentials: 'include' } },
          ),
        )
        return true
      } catch (skipError) {
        notifyErrorUnlessSessionExpired(skipError, SkipErrorMessage)
        return false
      }
    })

  const handleRead = () =>
    consume((article) => {
      // ブラウザのポップアップ制限を避けるため、await より前のクリック処理内で開く
      window.open(article.url, '_blank', 'noopener,noreferrer')
      return markAsRead(article.articleId)
    })

  const handleLater = () => {
    if (actionInFlight.current || isActionLoading || isInitialLoading) return
    setQueue((prev) => {
      if (prev.length <= 1) return prev
      const [head, ...rest] = prev
      return [...rest, head]
    })
  }

  // 保存中も次の記事を読めるよう、キューが空の場合だけスケルトンを表示する
  const isFetchingNextBatch = isValidating && queue.length === 0
  const isLoading =
    isInitialLoading || (isActionLoading && queue.length === 0) || isFetchingNextBatch

  const retry = () => {
    if (!actionInFlight.current) void mutate()
  }

  return {
    isLoading,
    isActionLoading,
    hasError: !!error,
    retry,
    isJustCompleted,
    currentArticle,
    remainingCount: remaining,
    handleSkip,
    handleRead,
    handleLater,
  }
}
