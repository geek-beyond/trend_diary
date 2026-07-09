import { type LoaderFunctionArgs, type MetaFunction, useLoaderData } from 'react-router'
import { resolveTurnstileSiteKey } from '@/client/entities/auth'
import { useLogin } from '@/client/features/authenticate/login'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import LoginPage from './page'

export const meta: MetaFunction = ({ matches }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: 'ログイン | TrendDiary',
      description:
        'TrendDiaryにログインして、技術トレンドの管理を始めましょう。Qiita、Zennの記事を効率的に管理できます。',
      path: '/login',
    }),
  )

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
