import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
import { toast } from 'sonner'

// OAuthのcallbackはリダイレクトで戻るため、失敗理由はクエリで受け取りトーストで通知する。
// リロードやURL共有で再表示されないよう、通知後にクエリを取り除く
export default function useOauthErrorToast(message: string) {
  const [searchParams, setSearchParams] = useSearchParams()
  const hasOauthError = searchParams.get('oauthError') === 'github'

  useEffect(() => {
    if (!hasOauthError) return

    // StrictModeのEffect二重実行でも、同一idのトーストは1つに集約される
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
