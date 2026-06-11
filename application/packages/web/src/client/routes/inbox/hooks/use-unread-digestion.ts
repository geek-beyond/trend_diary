import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { useEffect, useRef, useState } from 'react'
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
  const [isActionLoading, setIsActionLoading] = useState(false)
  const [isJustCompleted, setIsJustCompleted] = useState(false)
  const previousRemainingCountRef = useRef<number | null>(null)
  const completionTriggeredByActionRef = useRef(false)

  const swrKey = enabled ? ['api/articles/unread-digestion', selectedMedia] : null
  const { data, isLoading } = useSWR<UnreadDigestionResponse>(swrKey, async () => {
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
    }
  })

  useEffect(() => {
    completionTriggeredByActionRef.current = false
    setQueue(data?.data ?? [])
  }, [data])

  useEffect(() => {
    const remainingCount = queue.length
    const previousRemainingCount = previousRemainingCountRef.current
    const reachedZeroByAction =
      previousRemainingCount !== null &&
      previousRemainingCount > 0 &&
      remainingCount === 0 &&
      completionTriggeredByActionRef.current
    const shouldPlayCompletion =
      reachedZeroByAction || (remainingCount === 0 && hasCompletionPending())

    if (shouldPlayCompletion && document.visibilityState === 'visible') {
      setIsJustCompleted(true)
      setCompletionPending(false)
    }

    previousRemainingCountRef.current = remainingCount
    completionTriggeredByActionRef.current = false
  }, [queue.length])

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

      completionTriggeredByActionRef.current = true
      setQueue((prev) => prev.slice(1))
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
      const isLastArticle = queue.length === 1
      window.open(currentArticle.url, '_blank', 'noopener,noreferrer')
      const isReadSuccess = await markAsRead(currentArticle.articleId)
      if (!isReadSuccess) return

      if (isLastArticle) {
        setCompletionPending(true)
      }

      completionTriggeredByActionRef.current = true
      setQueue((prev) => prev.slice(1))
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
    isLoading: isLoading || isActionLoading,
    isJustCompleted,
    currentArticle,
    remainingCount: queue.length,
    handleSkip,
    handleRead,
    handleLater,
  }
}
