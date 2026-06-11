import Logger from '@trend-diary/common/logger'
import {
  type ActionFunctionArgs,
  type LoaderFunctionArgs,
  type MetaFunction,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
} from 'react-router'
import { callAuthApi } from '@/client/features/authenticate/auth-api'
import {
  AUTH_ERROR_MESSAGES,
  resolveSignupErrorMessage,
} from '@/client/features/authenticate/error-message'
import { resolveTurnstileSiteKey } from '@/client/features/authenticate/turnstile'
import {
  type AuthenticateErrors,
  validateAuthenticateForm,
} from '@/client/features/authenticate/validation'
import SignupPage from './page'

interface SignupActionData {
  errors?: AuthenticateErrors
  formError?: string
}

const logger = new Logger('info', { route: 'web/client/routes/signup/action' })

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

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData()
  const validation = validateAuthenticateForm(formData)
  if (!validation.isValid) {
    return { errors: validation.errors } satisfies SignupActionData
  }

  const captchaTokenValue = formData.get('cf-turnstile-response')
  const captchaToken = typeof captchaTokenValue === 'string' ? captchaTokenValue : undefined

  // CAPTCHA有効時にトークン未取得のまま送信させない
  if (resolveTurnstileSiteKey(context) && !captchaToken) {
    return { formError: AUTH_ERROR_MESSAGES.captchaRequired } satisfies SignupActionData
  }

  try {
    const response = await callAuthApi(request, context, {
      path: '/api/auth/signup',
      method: 'POST',
      body: {
        email: validation.data.email,
        password: validation.data.password,
        captchaToken,
      },
    })

    if (!response.ok) {
      return {
        formError: resolveSignupErrorMessage({ statusCode: response.status }),
      } satisfies SignupActionData
    }

    return redirect('/login')
  } catch (error) {
    logger.error('Unexpected error in signup action', error)
    return { formError: AUTH_ERROR_MESSAGES.unexpected } satisfies SignupActionData
  }
}

export default function Signup() {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()

  return (
    <SignupPage
      isSubmitting={navigation.state === 'submitting'}
      errors={actionData?.errors}
      formError={actionData?.formError}
      turnstileSiteKey={turnstileSiteKey ?? undefined}
    />
  )
}
