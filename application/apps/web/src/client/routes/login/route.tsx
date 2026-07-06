import { type LoaderFunctionArgs, type MetaFunction, useLoaderData } from 'react-router'
import { resolveTurnstileSiteKey, useLogin } from '@/client/features/authenticate'
import LoginPage from './page'

export const meta: MetaFunction = () => [
  { title: 'ログイン | TrendDiary' },
  {
    name: 'description',
    content:
      'TrendDiaryにログインして、技術トレンドの管理を始めましょう。Qiita、Zennの記事を効率的に管理できます。',
  },
  { property: 'og:title', content: 'ログイン | TrendDiary' },
  {
    property: 'og:description',
    content:
      'TrendDiaryにログインして、技術トレンドの管理を始めましょう。Qiita、Zennの記事を効率的に管理できます。',
  },
  { property: 'og:url', content: '/login' },
  { name: 'twitter:title', content: 'ログイン | TrendDiary' },
  {
    name: 'twitter:description',
    content:
      'TrendDiaryにログインして、技術トレンドの管理を始めましょう。Qiita、Zennの記事を効率的に管理できます。',
  },
]

export function loader({ context }: LoaderFunctionArgs) {
  return {
    turnstileSiteKey: resolveTurnstileSiteKey(context) ?? null,
  }
}

export default function Login() {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()
  const { isSubmitting, errors, formError, submit } = useLogin(turnstileSiteKey ?? undefined)

  return (
    <LoginPage
      onSubmit={submit}
      isSubmitting={isSubmitting}
      errors={errors}
      formError={formError}
      turnstileSiteKey={turnstileSiteKey ?? undefined}
    />
  )
}
