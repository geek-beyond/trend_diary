import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useSearchParams,
} from 'react-router'
import { resolveTurnstileSiteKey } from '@/client/entities/session'
import { GITHUB_AUTH_MESSAGES, useOAuthError } from '@/client/features/github-auth'
import { resolveLoginRedirectTarget, useLogin } from '@/client/features/sessions'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import { appLoadContext } from '@/load-context'
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
    turnstileSiteKey: resolveTurnstileSiteKey(context.get(appLoadContext)) ?? null,
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

  useOAuthError(GITHUB_AUTH_MESSAGES.loginFailed)

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
