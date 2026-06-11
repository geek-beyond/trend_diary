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
import { buildSetCookieHeaders, callAuthApi } from '@/client/features/authenticate/auth-api'
import {
  AUTH_ERROR_MESSAGES,
  resolveLoginErrorMessage,
} from '@/client/features/authenticate/error-message'
import { resolveTurnstileSiteKey } from '@/client/features/authenticate/turnstile'
import {
  type AuthenticateErrors,
  validateAuthenticateForm,
} from '@/client/features/authenticate/validation'
import LoginPage from './page'

interface LoginActionData {
  errors?: AuthenticateErrors
  formError?: string
}

const logger = new Logger('info', { route: 'web/client/routes/login/action' })

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
  return { turnstileSiteKey: resolveTurnstileSiteKey(context) ?? null }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData()
  const validation = validateAuthenticateForm(formData)
  if (!validation.isValid) {
    return { errors: validation.errors } satisfies LoginActionData
  }

  const captchaTokenValue = formData.get('cf-turnstile-response')
  const captchaToken = typeof captchaTokenValue === 'string' ? captchaTokenValue : undefined

  // CAPTCHA有効時にトークン未取得のまま送信させない
  if (resolveTurnstileSiteKey(context) && !captchaToken) {
    return { formError: AUTH_ERROR_MESSAGES.captchaRequired } satisfies LoginActionData
  }

  try {
    const response = await callAuthApi(request, context, {
      path: '/api/auth/login',
      method: 'POST',
      body: {
        email: validation.data.email,
        password: validation.data.password,
        captchaToken,
      },
    })

    if (!response.ok) {
      return {
        formError: resolveLoginErrorMessage(response.status),
      } satisfies LoginActionData
    }

    // APIが発行したセッションCookieを転送しないと、リダイレクト先でログイン状態にならない
    return redirect('/trends', { headers: buildSetCookieHeaders(response) })
  } catch (error) {
    logger.error('Unexpected error in login action', error)
    return { formError: AUTH_ERROR_MESSAGES.unexpected } satisfies LoginActionData
  }
}

export default function Login() {
  const { turnstileSiteKey } = useLoaderData<typeof loader>()
  const actionData = useActionData<typeof action>()
  const navigation = useNavigation()

  return (
    <LoginPage
      isSubmitting={navigation.state === 'submitting'}
      errors={actionData?.errors}
      formError={actionData?.formError}
      turnstileSiteKey={turnstileSiteKey ?? undefined}
    />
  )
}
