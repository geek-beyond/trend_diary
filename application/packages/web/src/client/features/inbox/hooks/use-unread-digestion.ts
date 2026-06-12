import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { type MediaType, useReadArticle } from '@/client/features/article'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'

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
  const [isJustCompleted, setIsJustCompleted] = useState(false)
  const completionTriggeredByActionRef = useRef(false)

  const swrKey = enabled ? ['api/articles/unread-digestion', selectedMedia] : null
  const { data, isLoading, isValidating, mutate } = useSWR<UnreadDigestionResponse>(
    swrKey,
    async () => {
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
    },
  )

  useEffect(() => {
    if (!data) return

    completionTriggeredByActionRef.current = false
    // 取得のたびにサーバ総数へ同期し、消化中の楽観的減算のズレを補正する
    setRemaining(data.total)
    setQueue(data.data)
  }, [data])

  useEffect(() => {
    // 完了演出はサーバ未読総数が操作によって0に達した時だけ出す。
    // 「操作で消化した」事実は completionTriggeredByActionRef が持ち、
    // それが立つのは表示中の記事を消化した時＝直前まで remaining>0 だった時に限る
    const reachedZeroByAction = remaining === 0 && completionTriggeredByActionRef.current
    const shouldPlayCompletion = reachedZeroByAction || (remaining === 0 && hasCompletionPending())

    if (shouldPlayCompletion && document.visibilityState === 'visible') {
      setIsJustCompleted(true)
      setCompletionPending(false)
    } else if (reachedZeroByAction) {
      // 操作直後にタブが非表示（別タブで読了等）なら、復帰時に演出を再生するため保留にする
      setCompletionPending(true)
    }

    completionTriggeredByActionRef.current = false
  }, [remaining])

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

  const consumeCurrent = () => {
    completionTriggeredByActionRef.current = true
    setRemaining((prev) => Math.max(0, prev - 1))
    setQueue((prev) => prev.slice(1))
  }

  // 取得状態はSWRのisValidatingで持つので、失敗・同一応答でもローディングに固定化しない
  const fetchNextBatchIfNeeded = () => {
    if (queue.length === 1 && remaining > 1) {
      void mutate().catch(() => {
        // 失敗時は次のrevalidate（フォーカス復帰等）で回復する
      })
    }
  }

  const handleSkip = async () => {
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
      fetchNextBatchIfNeeded()
    } catch (_error) {
      toast.error(SkipErrorMessage)
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleRead = async () => {
    if (!currentArticle) return
    setIsActionLoading(true)

    try {
      window.open(currentArticle.url, '_blank', 'noopener,noreferrer')
      const isReadSuccess = await markAsRead(currentArticle.articleId)
      if (!isReadSuccess) return

      consumeCurrent()
      fetchNextBatchIfNeeded()
    } finally {
      setIsActionLoading(false)
    }
  }

  const handleLater = () => {
    setQueue((prev) => {
      if (prev.length <= 1) return prev
      const [head, ...rest] = prev
      return [...rest, head]
    })
  }

  return {
    // 次バッチ取得中はキューが空。記事表示中のフォーカス再検証ではローディングを出さない
    isLoading: isLoading || isActionLoading || (isValidating && queue.length === 0),
    isJustCompleted,
    currentArticle,
    remainingCount: remaining,
    handleSkip,
    handleRead,
    handleLater,
  }
}
