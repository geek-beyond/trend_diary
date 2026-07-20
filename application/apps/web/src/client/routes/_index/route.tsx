import type { MetaFunction } from 'react-router'
import { useSession } from '@/client/entities/session'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import TopPage from './page'

export const meta: MetaFunction = ({ matches, location }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: 'TrendDiary | 技術トレンドを効率的に管理',
      description:
        'QiitaやZennの記事を日記のように管理し、技術トレンドを見逃さない。技術者向けのトレンド管理ブラウザアプリです。',
      path: location.pathname,
    }),
  )

export default function Index() {
  const { isLoggedIn } = useSession()

  return <TopPage isLoggedIn={isLoggedIn} />
}
