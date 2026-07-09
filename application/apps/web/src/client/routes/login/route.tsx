import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useSearchParams,
} from 'react-router'
import { resolveTurnstileSiteKey } from '@/client/entities/auth'
import { resolveLoginRedirectTarget, useLogin } from '@/client/features/authenticate/login'
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
  const [searchParams] = useSearchParams()
  const redirectTo = resolveLoginRedirectTarget(searchParams.get('redirect'))
  const { isSubmitting, errors, formError, submit } = useLogin(
    turnstileSiteKey ?? undefined,
    redirectTo,
  )

  return (
    <LoginPage
      onSubmit={submit}
      isSubmitting={isSubmitting}
      errors={errors}
      formError={formError}
      turnstileSiteKey={turnstileSiteKey ?? undefined}
      redirectTo={redirectTo}
    />
  )
}
