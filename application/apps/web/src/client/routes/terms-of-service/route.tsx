import type { MetaFunction } from 'react-router'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import TermsOfServicePage from './page'

export const meta: MetaFunction = ({ matches }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: '利用規約 | TrendDiary',
      description: 'TrendDiaryの利用規約。サービスのご利用条件についてご確認いただけます。',
      path: '/terms-of-service',
    }),
  )

export default function TermsOfService() {
  return <TermsOfServicePage />
}
