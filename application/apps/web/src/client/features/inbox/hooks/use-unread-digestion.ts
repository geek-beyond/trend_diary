import type { ArticleOutput } from '@trend-diary/domain/article/schema/article-schema'
import { useState } from 'react'
import { toast } from 'sonner'
import useSWR from 'swr'
import { isSessionExpiredError } from '@/client/entities/auth'
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
  // 直近で同期済みのバッチ。SWR が新しい応答を返したか（参照が変わったか）の判定に使う
  const [syncedBatch, setSyncedBatch] = useState<UnreadDigestionResponse>()
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

  // SWR が新しいバッチを返したらキュー/残数を同期する。消化中の楽観更新は次の取得まで保持する。
  // SWR は同一内容の再取得では data の参照を保つため、深く等しい応答ではここをスキップできる
  if (data && data !== syncedBatch) {
    setSyncedBatch(data)
    setRemaining(data.total)
    setQueue(data.data)
  }

  const { isJustCompleted, notifyConsumed } = useCompletionCelebration({
    remaining,
    queueLength: queue.length,
    batchToken: data,
  })

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
      await apiCall(() =>
        client.articles[':article_id'].skip.$post(
          {
            param: { article_id: currentArticle.articleId },
          },
          { init: { credentials: 'include' } },
        ),
      )

      consumeCurrent()
      fetchNextBatchIfNeeded()
    } catch (error) {
      // セッション切れの案内はcreateSWRFetcher側で表示済みのため、ここでは重複させない
      if (!isSessionExpiredError(error)) {
        toast.error(SkipErrorMessage)
      }
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
