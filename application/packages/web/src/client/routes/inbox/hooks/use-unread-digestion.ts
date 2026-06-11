import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { useCallback, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'
import type { MediaType } from '../../trends._index/components/media-filter'
import useReadArticle from '../../trends._index/hooks/use-read-article'

export type Article = Omit<ArticleOutput, 'articleId'> & {
  articleId: string
}

interface UnreadDigestionResponse {
  data: Article[]
  total: number
}

const SkipErrorMessage = 'スキップに失敗しました'
const CompletionPendingStorageKey = 'inbox-completion-pending'
const CompletionDisplayDurationMs = 2500

const setCompletionPending = (pending: boolean) => {
  try {
    if (pending) {
      window.sessionStorage.setItem(CompletionPendingStorageKey, '1')
      return
    }

    window.sessionStorage.removeItem(CompletionPendingStorageKey)
  } catch {
    // INFO: ストレージ利用不可環境では完了演出の遅延再生を無効化する
  }
}

const hasCompletionPending = () => {
  try {
    return window.sessionStorage.getItem(CompletionPendingStorageKey) === '1'
  } catch {
    return false
  }
}

export default function useUnreadDigestion(enabled: boolean, selectedMedia: MediaType) {
  const { client, apiCall } = createSWRFetcher()
  const { markAsRead } = useReadArticle()
  const [queue, setQueue] = useState<Article[]>([])
  // バッチ件数ではなく未読総数。残件表示と完了判定の基準にする
  const [remaining, setRemaining] = useState(0)
  const [isActionLoading, setIsActionLoading] = useState(false)
  // キュー枯渇後に次バッチを取得している間。空表示と完了演出を抑止する
  const [isFetchingNextBatch, setIsFetchingNextBatch] = useState(false)
  const [isJustCompleted, setIsJustCompleted] = useState(false)
  const previousRemainingRef = useRef<number | null>(null)
  const completionTriggeredByActionRef = useRef(false)
  const nextBatchRequestedRef = useRef(false)

  const swrKey = enabled ? ['api/articles/unread-digestion', selectedMedia] : null
  const { data, isLoading, mutate } = useSWR<UnreadDigestionResponse>(swrKey, async () => {
    const query = selectedMedia ? { media: selectedMedia } : {}
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
  })

  useEffect(() => {
    if (!data) return

    completionTriggeredByActionRef.current = false
    nextBatchRequestedRef.current = false
    setIsFetchingNextBatch(false)
    // 取得のたびにサーバ総数へ同期し、消化中の楽観的減算のズレを補正する
    setRemaining(data.total)
    setQueue(data.data)
  }, [data])

  useEffect(() => {
    const count = remaining
    const previousCount = previousRemainingRef.current
    const reachedZeroByAction =
      previousCount !== null &&
      previousCount > 0 &&
      count === 0 &&
      completionTriggeredByActionRef.current
    const shouldPlayCompletion = reachedZeroByAction || (count === 0 && hasCompletionPending())

    if (shouldPlayCompletion && document.visibilityState === 'visible') {
      setIsJustCompleted(true)
      setCompletionPending(false)
    } else if (reachedZeroByAction) {
      // 別タブで読了中はタブが非表示。復帰時に演出を再生するため保留にする
      setCompletionPending(true)
    }

    previousRemainingRef.current = count
    completionTriggeredByActionRef.current = false
  }, [remaining])

  useEffect(() => {
    // ローカルのバッチを消化しきっても未読が残っていれば続きを取得する。
    // キューが0になるのはread/skipのみ（「後で」は回転のみ）
    if (queue.length !== 0) return
    if (remaining <= 0) return
    if (nextBatchRequestedRef.current) return

    nextBatchRequestedRef.current = true
    setIsFetchingNextBatch(true)
    void mutate()
  }, [queue.length, remaining, mutate])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      if (queue.length !== 0) return
      if (!hasCompletionPending()) return

      setIsJustCompleted(true)
      setCompletionPending(false)
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [queue.length])

  useEffect(() => {
    if (!isJustCompleted) return

    const timerId = window.setTimeout(() => {
      setIsJustCompleted(false)
    }, CompletionDisplayDurationMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [isJustCompleted])

  const currentArticle = queue[0] ?? null

  const consumeCurrent = useCallback(() => {
    completionTriggeredByActionRef.current = true
    setRemaining((prev) => Math.max(0, prev - 1))
    setQueue((prev) => prev.slice(1))
  }, [])

  const handleSkip = useCallback(async () => {
    if (!currentArticle) return
    setIsActionLoading(true)

    try {
      const res = await client.articles[':article_id'].skip.$post(
        {
          param: { article_id: currentArticle.articleId },
        },
        { init: { credentials: 'include' } },
      )

      if (res.status !== 201) {
        throw new Error('Failed to skip article')
      }

      consumeCurrent()
    } catch (_error) {
      toast.error(SkipErrorMessage)
    } finally {
      setIsActionLoading(false)
    }
  }, [client.articles, currentArticle, consumeCurrent])

  const handleRead = useCallback(async () => {
    if (!currentArticle) return
    setIsActionLoading(true)

    try {
      window.open(currentArticle.url, '_blank', 'noopener,noreferrer')
      const isReadSuccess = await markAsRead(currentArticle.articleId)
      if (!isReadSuccess) return

      consumeCurrent()
    } finally {
      setIsActionLoading(false)
    }
  }, [currentArticle, markAsRead, consumeCurrent])

  const handleLater = useCallback(() => {
    setQueue((prev) => {
      if (prev.length <= 1) return prev
      const [head, ...rest] = prev
      return [...rest, head]
    })
  }, [])

  return {
    isLoading: isLoading || isActionLoading || isFetchingNextBatch,
    isJustCompleted,
    currentArticle,
    remainingCount: remaining,
    handleSkip,
    handleRead,
    handleLater,
  }
}
