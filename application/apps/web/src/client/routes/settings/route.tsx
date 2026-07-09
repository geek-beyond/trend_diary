import { type MetaFunction, useOutletContext } from 'react-router'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import type { AppLayoutOutletContext } from '../app-layout'
import SettingsPage from './page'

export const meta: MetaFunction = ({ matches }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: '設定 | TrendDiary',
      description: 'TrendDiaryのアカウント設定を変更できます。',
      path: '/settings',
    }),
  )

export default function SettingsRoute() {
  const { isLoggedIn } = useOutletContext<AppLayoutOutletContext>()

  return <SettingsPage isLoggedIn={isLoggedIn} />
}
