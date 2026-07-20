import { type LoaderFunctionArgs, type MetaFunction, useLoaderData } from 'react-router'
import { resolveTurnstileSiteKey } from '@/client/entities/auth'
import { useSignup } from '@/client/features/registrations'
import { mergeMeta, pageMeta } from '@/client/lib/meta'
import { appLoadContext } from '@/load-context'
import SignupPage from './page'

export const meta: MetaFunction = ({ matches, location }) =>
  mergeMeta(
    matches,
    pageMeta({
      title: 'アカウント作成 | TrendDiary',
      description:
        'TrendDiaryのアカウントを作成して、技術トレンドの管理を始めましょう。無料で始められる技術者向けサービスです。',
      path: location.pathname,
    }),
  )

export function loader({ context }: LoaderFunctionArgs) {
  return { turnstileSiteKey: resolveTurnstileSiteKey(context.get(appLoadContext)) ?? null }
}

export default function Signup() {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()
  const { isSubmitting, errors, formError, submit } = useSignup(turnstileSiteKey ?? undefined)

  return (
    <SignupPage
      onSubmit={submit}
      isSubmitting={isSubmitting}
      errors={errors}
      formError={formError}
      turnstileSiteKey={turnstileSiteKey ?? undefined}
    />
  )
}
