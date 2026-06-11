import { type LoaderFunctionArgs, type MetaFunction, useLoaderData } from 'react-router'
import { resolveTurnstileSiteKey } from '@/client/features/authenticate/turnstile'
import useSignup from './hooks/use-signup'
import SignupPage from './page'

export const meta: MetaFunction = () => [
  { title: 'アカウント作成 | TrendDiary' },
  {
    name: 'description',
    content:
      'TrendDiaryのアカウントを作成して、技術トレンドの管理を始めましょう。無料で始められる技術者向けサービスです。',
  },
  { property: 'og:title', content: 'アカウント作成 | TrendDiary' },
  {
    property: 'og:description',
    content:
      'TrendDiaryのアカウントを作成して、技術トレンドの管理を始めましょう。無料で始められる技術者向けサービスです。',
  },
  { property: 'og:url', content: '/signup' },
  { name: 'twitter:title', content: 'アカウント作成 | TrendDiary' },
  {
    name: 'twitter:description',
    content:
      'TrendDiaryのアカウントを作成して、技術トレンドの管理を始めましょう。無料で始められる技術者向けサービスです。',
  },
]

export function loader({ context }: LoaderFunctionArgs) {
  return { turnstileSiteKey: resolveTurnstileSiteKey(context) ?? null }
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
