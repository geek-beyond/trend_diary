import { wrapAsyncCall } from '@trend-diary/std/result'
import { useState } from 'react'
import { notifyErrorUnlessSessionExpired } from '@/client/entities/session'
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
      notifyErrorUnlessSessionExpired(result.error, MarkAsReadErrorMessage)
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
      notifyErrorUnlessSessionExpired(result.error, MarkAsUnreadErrorMessage)
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
