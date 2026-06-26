import type { MetaFunction } from 'react-router'
import PrivacyPolicyPage from './page'

export const meta: MetaFunction = () => {
  const title = 'プライバシーポリシー | TrendDiary'
  const description =
    'TrendDiaryのプライバシーポリシー。個人情報の取り扱い、収集する情報、利用目的についてご確認いただけます。'

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: '/privacy-policy' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ]
}

export default function PrivacyPolicy() {
  return <PrivacyPolicyPage />
}
