import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useSearchParams,
} from 'react-router'
import { resolveTurnstileSiteKey } from '@/client/entities/auth'
import { resolveLoginRedirectTarget, useLogin } from '@/client/features/authenticate/login'
import { GITHUB_AUTH_MESSAGES } from '@/client/features/github-auth'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import LoginPage from './page'

export const meta: MetaFunction = ({ matches, location }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: 'ログイン | TrendDiary',
      description:
        'TrendDiaryにログインして、技術トレンドの管理を始めましょう。Qiita、Zennの記事を効率的に管理できます。',
      path: location.pathname,
    }),
  )

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
  // OAuthのcallbackはリダイレクトで戻るため、失敗理由はクエリで受け取って表示する
  const oauthError =
    searchParams.get('oauthError') === 'github' ? GITHUB_AUTH_MESSAGES.loginFailed : undefined

  return (
    <LoginPage
      onSubmit={submit}
      isSubmitting={isSubmitting}
      errors={errors}
      formError={formError ?? oauthError}
      turnstileSiteKey={turnstileSiteKey ?? undefined}
      redirectTo={redirectTo}
    />
  )
}
