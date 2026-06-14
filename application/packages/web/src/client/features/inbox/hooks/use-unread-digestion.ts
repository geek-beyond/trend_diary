import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { type MediaType, useReadArticle } from '@/client/features/article'
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

export default function useUnreadDigestion(enabled: boolean, selectedMedia: MediaType) {
  const { client, apiCall } = createSWRFetcher()
  const { markAsRead } = useReadArticle()
  const [queue, setQueue] = useState<Article[]>([])
  // バッチ件数ではなく未読総数。残件表示と完了判定の基準にする
  const [remaining, setRemaining] = useState(0)
  const [isActionLoading, setIsActionLoading] = useState(false)
  const swrKey = enabled ? ['api/articles/unread-digestion', selectedMedia] : null
  const {
    data,
    isLoading: isInitialLoading,
    isValidating,
    mutate,
  } = useSWR<UnreadDigestionResponse>(swrKey, async () => {
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

  const { isJustCompleted, notifyConsumed } = useCompletionCelebration({
    remaining,
    queueLength: queue.length,
    batchToken: data,
  })

  useEffect(() => {
    if (!data) return

    // 取得のたびにサーバ総数へ同期し、消化中の楽観的減算のズレを補正する
    setRemaining(data.total)
    setQueue(data.data)
  }, [data])

  const currentArticle = queue[0] ?? null

  const consumeCurrent = () => {
    notifyConsumed()
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

  // 次バッチ取得中はキューが空になる。記事表示中のフォーカス再検証ではキューが残るのでローディングを出さない
  const isFetchingNextBatch = isValidating && queue.length === 0
  const isLoading = isInitialLoading || isActionLoading || isFetchingNextBatch

  return {
    isLoading,
    isJustCompleted,
    currentArticle,
    remainingCount: remaining,
    handleSkip,
    handleRead,
    handleLater,
  }
}
