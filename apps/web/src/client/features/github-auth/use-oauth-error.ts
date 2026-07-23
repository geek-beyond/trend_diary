import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

// GitHub OAuthの失敗はcallbackからoauthErrorクエリで戻るため、トーストで通知し、
// 再表示を防ぐため通知後にクエリを取り除く（同一idでStrictModeの二重実行も集約する）
export function useOAuthError(message: string): void {
  const [searchParams, setSearchParams] = useSearchParams()
  const hasOauthError = searchParams.get('oauthError') === 'github'

  useEffect(() => {
    if (!hasOauthError) return

    toast.error(message, { id: 'github-oauth-error' })
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('oauthError')
        return next
      },
      { replace: true },
    )
  }, [hasOauthError, message, setSearchParams])
}
