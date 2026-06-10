import { wrapAsyncCall } from '@trend-diary/common/result'
import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import getApiClientForClient from '../../../infrastructure/api'

const MarkAsReadErrorMessage = '既読に失敗しました'
const MarkAsUnreadErrorMessage = '未読に失敗しました'

export default function useReadArticle() {
  const [isLoading, setIsLoading] = useState(false)

  const markAsRead = useCallback(async (articleId: string): Promise<boolean> => {
    setIsLoading(true)

    const result = await wrapAsyncCall(async () => {
      const client = getApiClientForClient()
      const res = await client.articles[':article_id'].read.$post(
        {
          param: { article_id: articleId },
          json: { read_at: new Date().toISOString() },
        },
        { init: { credentials: 'include' } },
      )

      if (res.status !== 201) {
        throw new Error('Failed to mark as read')
      }
    })

    setIsLoading(false)

    if (result.isErr()) {
      toast.error(MarkAsReadErrorMessage)
      return false
    }

    return true
  }, [])

  const markAsUnread = useCallback(async (articleId: string): Promise<boolean> => {
    setIsLoading(true)

    const result = await wrapAsyncCall(async () => {
      const client = getApiClientForClient()
      const res = await client.articles[':article_id'].unread.$delete(
        {
          param: { article_id: articleId },
        },
        { init: { credentials: 'include' } },
      )

      if (res.status !== 200) {
        throw new Error('Failed to mark as unread')
      }
    })

    setIsLoading(false)

    if (result.isErr()) {
      toast.error(MarkAsUnreadErrorMessage)
      return false
    }

    return true
  }, [])

  return {
    markAsRead,
    markAsUnread,
    isLoading,
  }
}
