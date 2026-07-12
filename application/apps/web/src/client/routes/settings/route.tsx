import { type MetaFunction } from 'react-router'
import { GITHUB_AUTH_MESSAGES, useOAuthError } from '@/client/features/github-auth'
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
  useOAuthError(GITHUB_AUTH_MESSAGES.linkFailed)

  return <SettingsPage />
}
