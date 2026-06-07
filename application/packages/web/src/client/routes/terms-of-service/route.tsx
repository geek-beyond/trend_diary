import type { MetaFunction } from 'react-router'
import TermsOfServicePage from './page'

export const meta: MetaFunction = () => {
  const title = '利用規約 | TrendDiary'
  const description = 'TrendDiaryの利用規約。サービスのご利用条件についてご確認いただけます。'

  return [
    { title },
    { name: 'description', content: description },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: '/terms-of-service' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
  ]
}

export default function TermsOfService() {
  return <TermsOfServicePage />
}
