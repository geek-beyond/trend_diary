import { wrapAsyncCall } from '@trend-diary/common/result'
import { useState } from 'react'
import { toast } from 'sonner'
import { isSessionExpiredError } from '@/client/entities/auth'
import createSWRFetcher from '@/client/infrastructure/create-swr-fetcher'

const MarkAsReadErrorMessage = '既読に失敗しました'
const MarkAsUnreadErrorMessage = '未読に失敗しました'

export default function useReadArticle() {
  const [isLoading, setIsLoading] = useState(false)
  const { client, apiCall } = createSWRFetcher()

  const markAsRead = async (articleId: string): Promise<boolean> => {
    setIsLoading(true)

    const result = await wrapAsyncCall(() =>
      apiCall(() =>
        client.articles[':article_id'].read.$post(
          {
            param: { article_id: articleId },
            json: { read_at: new Date().toISOString() },
          },
          { init: { credentials: 'include' } },
        ),
      ),
    )

    setIsLoading(false)

    if (result.isErr()) {
      // セッション切れの案内はcreateSWRFetcher側で表示済みのため、ここでは重複させない
      if (!isSessionExpiredError(result.error)) {
        toast.error(MarkAsReadErrorMessage)
      }
      return false
    }

    return true
  }

  const markAsUnread = async (articleId: string): Promise<boolean> => {
    setIsLoading(true)

    const result = await wrapAsyncCall(() =>
      apiCall(() =>
        client.articles[':article_id'].unread.$delete(
          {
            param: { article_id: articleId },
          },
          { init: { credentials: 'include' } },
        ),
      ),
    )

    setIsLoading(false)

    if (result.isErr()) {
      if (!isSessionExpiredError(result.error)) {
        toast.error(MarkAsUnreadErrorMessage)
      }
      return false
    }

    return true
  }

  return {
    markAsRead,
    markAsUnread,
    isLoading,
  }
}
