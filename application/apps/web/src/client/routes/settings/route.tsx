import { useEffect } from 'react'
import { type MetaFunction, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { GITHUB_AUTH_MESSAGES } from '@/client/features/github-auth'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import SettingsPage from './page'

export const meta: MetaFunction = ({ matches, location }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: '設定 | TrendDiary',
      description: 'TrendDiaryのアカウント設定を変更できます。',
      path: location.pathname,
    }),
  )

export default function SettingsRoute() {
  const [searchParams, setSearchParams] = useSearchParams()
  const hasOauthError = searchParams.get('oauthError') === 'github'

  // OAuth連携のcallbackはリダイレクトで戻るため、失敗理由はクエリで受け取りトーストで通知する。
  // リロードや共有で再表示されないよう、通知後にクエリを取り除く
  useEffect(() => {
    if (!hasOauthError) return

    toast.error(GITHUB_AUTH_MESSAGES.linkFailed)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('oauthError')
        return next
      },
      { replace: true },
    )
  }, [hasOauthError, setSearchParams])

  return <SettingsPage />
}
