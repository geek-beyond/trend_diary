import { wrapAsyncCall } from '@trend-diary/std/result'
import { useState } from 'react'
import { toast } from 'sonner'
import { GITHUB_AUTH_MESSAGES } from '@/client/features/github-auth/model'
import getApiClientForClient from '@/client/infrastructure/api'

export default function useGithubUnlink() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const unlink = async () => {
    setIsSubmitting(true)
    const client = getApiClientForClient()

    const result = await wrapAsyncCall(() =>
      client.oauth[':provider'].$delete({ param: { provider: 'github' } }),
    )
    setIsSubmitting(false)

    if (result.isErr() || !result.value.ok) {
      // 400は「唯一のログイン手段のため解除不可」の業務エラーなので、案内を出し分ける。
      // エラー時のステータスはRPCの型に現れないため、numberに広げてから比較する
      const status: number | undefined = result.isOk() ? result.value.status : undefined
      const isBlocked = status === 400
      toast.error(
        isBlocked ? GITHUB_AUTH_MESSAGES.unlinkBlocked : GITHUB_AUTH_MESSAGES.unlinkFailed,
      )
      return false
    }

    toast.success(GITHUB_AUTH_MESSAGES.unlinked)
    return true
  }

  return { isSubmitting, unlink }
}
