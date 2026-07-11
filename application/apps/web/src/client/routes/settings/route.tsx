import { type MetaFunction, useSearchParams } from 'react-router'
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
  const [searchParams] = useSearchParams()
  // OAuth連携のcallbackはリダイレクトで戻るため、失敗理由はクエリで受け取って表示する
  const githubLinkError =
    searchParams.get('oauthError') === 'github' ? GITHUB_AUTH_MESSAGES.linkFailed : undefined

  return <SettingsPage githubLinkError={githubLinkError} />
}
