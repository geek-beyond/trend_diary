import type { MetaFunction } from 'react-router'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import PrivacyPolicyPage from './page'

export const meta: MetaFunction = ({ matches }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: 'プライバシーポリシー | TrendDiary',
      description:
        'TrendDiaryのプライバシーポリシー。個人情報の取り扱い、収集する情報、利用目的についてご確認いただけます。',
      path: '/privacy-policy',
    }),
  )

export default function PrivacyPolicy() {
  return <PrivacyPolicyPage />
}
