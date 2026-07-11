import { useEffect } from 'react'
import {
  type LoaderFunctionArgs,
  type MetaFunction,
  useLoaderData,
  useSearchParams,
} from 'react-router'
import { toast } from 'sonner'
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
  const [searchParams, setSearchParams] = useSearchParams()
  const redirectTo = resolveLoginRedirectTarget(searchParams.get('redirect'))
  const hasOauthError = searchParams.get('oauthError') === 'github'
  const { isSubmitting, errors, formError, submit } = useLogin(
    turnstileSiteKey ?? undefined,
    redirectTo,
  )

  // GitHubログインの失敗はcallbackからクエリで戻るため、トーストで通知し、
  // 再表示を防ぐため通知後にクエリを取り除く（同一idでStrictModeの二重実行も集約する）
  useEffect(() => {
    if (!hasOauthError) return

    toast.error(GITHUB_AUTH_MESSAGES.loginFailed, { id: 'github-oauth-error' })
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('oauthError')
        return next
      },
      { replace: true },
    )
  }, [hasOauthError, setSearchParams])

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
